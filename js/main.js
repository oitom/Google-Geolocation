function loadPlaces() { 
    $.getJSON( "data/base.json", function( data ) {
        $.each(data.places, function(index, obj) {
            var htmlPop = ` <h6 class="tit-pop">${obj.name}</h6>
                            <p class="line-pop"><i class="fa fa-map-marker blue" aria-hidden="true"></i> ${obj.end}</p>
                            <p class="line-pop"><i class="fa fa-clock-o blue" aria-hidden="true"></i> ${obj.horario}</p>
                            <p class="line-pop"><i class="fa fa-info-circle blue" aria-hidden="true"></i> ${obj.info}</p>
                            <a class="a-pop" href="${obj.link}" target="_blank">Rota</a>`;

            var pos = { lat: obj.lat, lng: obj.lng };

            var marker = new google.maps.Marker({
                position: pos,
                map: map,
                title: obj.name,
                icon: pinSymbol("#4b96f3"),
            });
            markers.push(marker);

            var infowindow = new google.maps.InfoWindow({
                content: htmlPop
            });

            marker.addListener('click', function() {                
                map.setZoom(14);
                map.setCenter(marker.getPosition());
                
                if (activeInfoWindow)
                    activeInfoWindow.close();

                infowindow.open(map, marker);
                activeInfoWindow = infowindow;
            });
        });
    });
}

function pinSymbol(color) {
    return {
        path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
        scale: 1,
        strokeWeight: 1,
        strokeColor: '#163046',
        fillColor: color,
        fillOpacity: 1,
   };
}

function clickZoom(e) {
    map.setView(e.target.getLatLng(), 15);
}

function resetMap() { 
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
    
    if(circAtual)
        circAtual.setMap(null);
    
    $("#distance").val(0);
    $(".km-cur").html('0 km');
    $("#itens-place").html('');

    loadPlaces();
}

function getLocate() {
    resetMap();
    infoWindow = new google.maps.InfoWindow;

    // Try HTML5 geolocation.
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            var marker = new google.maps.Marker({
                position: pos,
                map: map,
                title: 'Você está aqui!'
            });
            markers.push(marker);

            marker.addListener('click', function() { 
                var z = map.getZoom();
                map.setZoom(z+=4);
                map.setCenter(marker.getPosition());
            });

            marker.setMap(map);
            map.setCenter(pos);
            map.setZoom(14);
            
            drawCirc(pos, 0);
            
            localAtual = marker;
        }, function() {
            handleLocationError(true, infoWindow, map.getCenter());
        });
    } else {
      // Browser doesn't support Geolocation
      handleLocationError(false, infoWindow, map.getCenter());
    }
}

function loadSearch() { 
    // controls/search
    var input = document.getElementById('pac-input');
    var autocomplete = new google.maps.places.Autocomplete(input);

    // Bind the map's bounds (viewport) property to the autocomplete object,
    // so that the autocomplete requests use the current map bounds for the
    // bounds option in the request.
    autocomplete.bindTo('bounds', map);

    // Set the data fields to return when the user selects a place.
    autocomplete.setFields(['address_components', 'geometry', 'icon', 'name']);

    var infowindow = new google.maps.InfoWindow();
    var infowindowContent = document.getElementById('infowindow-content');
    infowindow.setContent(infowindowContent);

    autocomplete.addListener('place_changed', function() {
        resetMap();
        
        var marker = new google.maps.Marker({
            map: map,
            anchorPoint: new google.maps.Point(0, -29),
            title: 'Você está aqui!'
        });
        marker.addListener('click', function() { 
            var z = map.getZoom();
            map.setZoom(z+=4);
            map.setCenter(marker.getPosition());
        });
        
        markers.push(marker);

        infowindow.close();
        marker.setVisible(false);
        var place = autocomplete.getPlace();

        if (!place.geometry){
            // User entered the name of a Place that was not suggested and
            // pressed the Enter key, or the Place Details request failed.
            window.alert("Nenhum resultado encontrado para: '" + place.name + "'");
            return;
        }

        // If the place has a geometry, then present it on a map.
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(17);  // Why 17? Because it looks good.
        }

        marker.setPosition(place.geometry.location);
        marker.setVisible(true);

        var address = '';
        if (place.address_components) {
            address = [
                (place.address_components[0] && place.address_components[0].short_name || ''),
                (place.address_components[1] && place.address_components[1].short_name || ''),
                (place.address_components[2] && place.address_components[2].short_name || '')
            ].join(' ');
        }    
        drawCirc(place.geometry.location, 0);
        localAtual = marker;
        map.setZoom(12);
        map.setCenter(localAtual.getPosition());
    });
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
                            'Error: O serviço de geolocalização falhou.' :
                            'Error: Seu navegador não suporta geolocalização');
    infoWindow.open(map);
}

function loadPlacesDistance(km) { 
    $(".km-cur").html(km+' km');
    $("#itens-place").html('');

    var pos = localAtual.getPosition();
    var lat = localAtual.getPosition().lat();
    var lng = localAtual.getPosition().lng();
    var zoom = 0;
    
    drawCirc(pos, km);
    findPlace(lat, lng, km);

    if(km < 10)
        zoom = 13;
    else if(km > 10 && km <  20)
        zoom = 12;
    else if(km > 20 && km <  30)
        zoom = 11;
    else 
        zoom = 8;

    map.setZoom(zoom);
    map.setCenter(localAtual.getPosition());
}

function findPlace(lat, lng, dis) { 
    $.getJSON( "data/base.json", function( data ) {
        $.each(data.places, function(index, obj) {
            var dif =  parseFloat(distance(lat, lng, obj.lat, obj.lng, 'K').toFixed(2));
            // dentro da distancia selecionada
            if(dif <= dis) { 
                var place = {"dis": dif, "place": obj};
                drawItem(place);
            }
        });
    });
}

function drawItem(place) { 
    var html = `<div class="place">
                    <h5>${place.place.name}</h5>
                    <p>${place.place.end}</p>
                    <p>Distância: ${place.dis} KM</p>
                </div>`;
    $("#itens-place").append(html);
}

function drawCirc(pos, radius) { 
    if(circAtual)
        circAtual.setMap(null);

    circAtual = new google.maps.Circle({
        strokeColor: '#709dbf',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#aadaff',
        fillOpacity: 0.35,
        map: map,
        center: pos,
        radius: radius * 1000
    });

} 

function distance(lat1, lon1, lat2, lon2, unit) {
	if ((lat1 == lat2) && (lon1 == lon2)) {
		return 0;
	}
	else {
		var radlat1 = Math.PI * lat1/180;
		var radlat2 = Math.PI * lat2/180;
		var theta = lon1-lon2;
		var radtheta = Math.PI * theta/180;
		var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        
        if (dist > 1) {
			dist = 1;
        }
        
		dist = Math.acos(dist);
		dist = dist * 180/Math.PI;
		dist = dist * 60 * 1.1515;
		if (unit=="K") { dist = dist * 1.609344 }
        if (unit=="N") { dist = dist * 0.8684 }
        
		return dist;
	}
}