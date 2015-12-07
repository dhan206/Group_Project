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
        var url = "http://api.songkick.com/api/3.0/events.json?apikey=io09K9l3ebJxmxe2";
        var layerControl;
        var typeLayers = {};
        // songkick api: io09K9l3ebJxmxe2

        L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGhhbjIwNiIsImEiOiJjaWZzeWE4c2QwZDAzdHRseWRkMXR2b2Y5In0.Gbh1YncNoaD5W4zylMfNTw", {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            maxZoom: 100,
            minZoom: 3,
            id: "mapbox.light",
            accessToken: "pk.eyJ1IjoiZGhhbjIwNiIsImEiOiJjaWZzeWE4c2QwZDAzdHRseWRkMXR2b2Y5In0.Gbh1YncNoaD5W4zylMfNTw"
        }).addTo(map);


        function fillMap(param) {
            $http.get(url + param)
                .success(function (response) {
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

                response.resultsPage.results.event.forEach(function (data) {

                    var lat = data.location.lat;
                    var lon = data.location.lng;
                    var marker = L.circleMarker([lat, lon]);
                    marker.setRadius(5);

                    if (!typeLayers.hasOwnProperty(data.ageRestriction)) {
                        typeLayers[data.ageRestriction] = L.layerGroup([]);
                    }

                    var artist = [];

                    data.performance.forEach(function(performance) {
                        artist.push(" " + performance.artist.displayName);
                    });

                    // TODO: Add spotify widget to map pop-ups, using the first artist in the artist array
                    // TODO: as the search parameter.

                    marker.bindPopup("<p class='eventTitle'>" + data.displayName + "</p><br><p class='artists'> Artist(s): " + artist.toString() + "</p> Event Date: " + data.start.date + "<br> Venue Name: " + data.venue.displayName + "<br><a href='https://maps.google.com?daddr=" + lat + "," + lon + "'target='_blank'>Get directions!</a>" + "<br><a href='" + data.uri + "'target='_blank'>Link to event page</a>" + "<br><iframe src='https://embed.spotify.com/?uri=spotify:track:4th1RQAelzqgY7wL53UGQt' width='300' height='80' frameborder='0' allowtransparency='true'></iframe>");
                    marker.addTo(typeLayers[data.ageRestriction]);
                });
                layerControl = L.control.layers(null, typeLayers, {collapsed: false});
                layerControl.addTo(map);
            });
        }

        //TODO: MAKE SEPARATE HANDLERS FOR THE 2 DATEPICKERS, MAKE IT LOOK PRETTY, SELECT ONE CHECKBOX DISABLES OTHER 
        $scope.today = new Date();
        $scope.dateStart = new Date();
        $scope.dateEnd = new Date();

        var dd = $scope.today.getDate();
        var mm = $scope.today.getMonth() + 1; //January is 0!
        var yyyy = $scope.today.getFullYear();

        if (dd < 10) {
            dd = '0' + dd
        }

        if (mm < 10) {
            mm = '0' + mm
        }

        $scope.today = mm + '/' + dd + '/' + yyyy;
        console.log($scope.today);

        $scope.open = function ($event) {
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

        $scope.format = "yyyy-MM-dd";

        $scope.submitForm = function () {
            var query = "";
            var metroID = "";


            if ($scope.city) {

                // Gets the metroID using the inputted city name. A requirement from songkick's api
                $http.get("http://api.songkick.com/api/3.0/search/locations.json?apikey=io09K9l3ebJxmxe2&query=" + $scope.city + "&per_page=1")
                    .success(function (response) {
                        console.log(response.resultsPage.results.location[0].metroArea.id);
                        metroID = response.resultsPage.results.location[0].metroArea.id;
                        query += "&location=sk:" + metroID;

                        if ($scope.dateStart) {
                            var startDate = angular.element(document.getElementById("endDate"))[0].value;
                            query += "&min_date=" + startDate;
                        }

                        if ($scope.dateEnd) {
                            var endDate = angular.element(document.getElementById("endDate"))[0].value;
                            query += "&max_date=" + endDate;
                        }

                        query += "&per_page=100";

                        console.log(url + query);

                        fillMap(query);
                    });
            }

        }
    }])
