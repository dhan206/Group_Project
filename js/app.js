"use strict";

angular.module("EventFinderApp", ['ngSanitize', 'ui.router', 'ui.bootstrap'])
    .config(function($stateProvider){
        $stateProvider
            //home page
            .state('home', {
                url: '/', //"root" directory
                templateUrl: 'partials/home.html',
                controller: "HomeCtrl"
            })
    })

    //returns the user to the homepage if an invalid route is given
    .config(function($urlRouterProvider) {
        $urlRouterProvider.otherwise('/');
    })

    .controller("HomeCtrl", ["$scope", "$http", function($scope, $http) {

        //the map
        var map = L.map('map-container').locate({setView: true, maxZoom: 12});
        var url = "http://api.eventful.com/json/events/search?app_key=fmP5gQxspkT4NNqS";
        var layerControl;
        var typeLayers = {};

        L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGhhbjIwNiIsImEiOiJjaWZzeWE4c2QwZDAzdHRseWRkMXR2b2Y5In0.Gbh1YncNoaD5W4zylMfNTw", {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            maxZoom: 100,
            minZoom: 3,
            id: "mapbox.light",
            accessToken: "pk.eyJ1IjoiZGhhbjIwNiIsImEiOiJjaWZzeWE4c2QwZDAzdHRseWRkMXR2b2Y5In0.Gbh1YncNoaD5W4zylMfNTw"
        }).addTo(map);

        //TODO: MAKE SEPARATE HANDLERS FOR THE 2 DATEPICKERS, MAKE IT LOOK PRETTY, SELECT ONE CHECKBOX DISABLES OTHER 
        $scope.today = new Date();
        $scope.dateStart = new Date();
        $scope.dateEnd = new Date();

        var dd = $scope.today.getDate();
        var mm = $scope.today.getMonth() + 1; //January is 0!
        var yyyy = $scope.today.getFullYear();

        if(dd<10) {
            dd='0'+dd
        } 

        if(mm<10) {
            mm='0'+mm
        } 

        $scope.today = mm+'/'+dd+'/'+yyyy;
        console.log($scope.today);

        $scope.open = function($event) {
            $scope.status.isOpen = true;
            console.log($scope.dateStart);
            console.log($scope.dateEnd);
        }

        $scope.dateOptions = {
            formatYear: 'yy',
            startingDay: 1
        };

        $scope.status = {
            opened: false
        };

        $scope.format = "yyyy MM dd";

        $scope.submitForm = function() {
            var query = "";

            if ($scope.city && !$scope.state) {
                query = query + "&location=" + $scope.city ;
            }

            if ($scope.city && $scope.state) {
                query = query + "&location=" + $scope.city + "," + $scope.state;
            }

            if ($scope.dateStart && $scope.dateEnd) {
                var startDate = angular.element(document.getElementById("endDate"))[0].value.replace(/ /g, "") + "00";
                var endDate = angular.element(document.getElementById("endDate"))[0].value.replace(/ /g, "") + "00";
                query += "&date=" + startDate + "-" + endDate;
            }

            if($scope.radius) {
                query += "&within=" + $scope.radius ;
            }

            query += "&page_size=50&?q=music&callback=JSON_CALLBACK";

            console.log(url + query);

            $http.jsonp(url + query)
                .success(function(response) {
                    // removes layer groups and layer control from the map
                    // for each new search
                    if (layerControl) {
                        Object.keys(typeLayers).forEach(function (layer) {
                            layerControl.removeLayer(typeLayers[layer]);
                            map.removeLayer(typeLayers[layer]);
                        });

                        layerControl.removeFrom(map);

                        typeLayers = {};
                    }
                    console.log(response);

                    response.events.event.forEach(function(data) {
                        console.log(data);
                        var lat = data.latitude;
                        var lon = data.longitude;
                        var marker = L.circleMarker([lat, lon]);
                        marker.setRadius(5);

                        if (!typeLayers.hasOwnProperty(data.olson_path)) {
                            typeLayers[data.olson_path] = L.layerGroup([]);
                        }

                        var date = new Date(data.datetime_local);
                        var month = date.getMonth() + 1;
                        marker.bindPopup("<p class='eventTitle'>" + data.title + "</p>" + month + "/" + date.getDate() + "/" + date.getFullYear()  + "<br>" + data.venue_name + "<br><a href='https://maps.google.com?daddr=" + lat + "," + lon + "'>Get directions!</a>" + "<br><a href='" + data.url + "'>Eventful Listing</a>");
                        marker.addTo(typeLayers[data.olson_path]);
                    });
                    layerControl = L.control.layers(null, typeLayers);
                    layerControl.addTo(map);
                });
        }

    }])
