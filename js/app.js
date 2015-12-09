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
        var map = L.map('map-container').locate({setView: true, maxZoom: 12, enableHighAccuracy: true});
        var url = "http://api.songkick.com/api/3.0/events.json?apikey=io09K9l3ebJxmxe2";
        var layerControl;
        var typeLayers = {};
        // songkick api: io09K9l3ebJxmxe2

        L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGhhbjIwNiIsImEiOiJjaWZzeWE4c2QwZDAzdHRseWRkMXR2b2Y5In0.Gbh1YncNoaD5W4zylMfNTw", {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            maxZoom: 100,
            minZoom: 3,
            id: "mapbox.emerald",
            accessToken: "pk.eyJ1IjoiZGhhbjIwNiIsImEiOiJjaWZzeWE4c2QwZDAzdHRseWRkMXR2b2Y5In0.Gbh1YncNoaD5W4zylMfNTw"
        }).addTo(map);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                var userLocation = L.circleMarker([position.coords.latitude, position.coords.longitude], {color: "red", fillColor: "red", opacity: 1, fillOpacity: .4});
                userLocation.setRadius(4);
                userLocation.bindPopup("<h6>You are here.</h6>");
                userLocation.addTo(map);
            });
        }

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

                var bounds = new L.LatLngBounds();
                response.resultsPage.results.event.forEach(function (data) {

                    var lat = data.location.lat;
                    var lon = data.location.lng;

                    var marker = L.marker([lat, lon]);
                    bounds.extend(marker.getLatLng());

                    if (!typeLayers.hasOwnProperty(data.type)) {
                        typeLayers[data.type] = L.layerGroup([]);
                    }

                    var artist = [];

                    data.performance.forEach(function(performance) {
                        artist.push(" " + performance.artist.displayName);
                    });

                    // spotify object variable
                    var trackObj;
                    var artistObj;

                    // ajax request to spotify for artist from songick
                    $.ajax({
                        url: 'https://api.spotify.com/v1/search',
                        data: {
                            q: artist.toString(),
                            type: 'artist'
                        },
                        success: function (response) {
                            if (response.artists.items[0] != undefined && artist[0].substring(1, artist[0].length).toString().localeCompare(response.artists.items[0].name) == 0) {

                                artistObj = response.artists.items[0];

                                // ajax request to spotify for top tracks of artist from previous chained ajax request
                                $.ajax({
                                    url: 'https://api.spotify.com/v1/artists/' + artistObj.id + '/top-tracks?country=SE',
                                    success: function (top) {
                                        trackObj = top.tracks[0];
                                        console.log(trackObj);

                                        // adds markers for shows with artists on  spotify
                                        marker.bindPopup("<p class='eventTitle'>" + data.displayName + "</p><p class='artists'> Artist(s): " 
                                            + artist.toString() + "</p> Event Date: " + data.start.date + "<br> Venue Name: " + 
                                            data.venue.displayName + "<br><a href='https://maps.google.com?daddr=" + lat + "," + lon + 
                                            "'target='_blank'>Get directions!</a>" + "<br><a href='" + data.uri + "'target='_blank'>Link to event page</a>" + 
                                            "<div class='container'><div class='row'><div class='col-xs-1'><img class='cover' src='" + trackObj.album.images[0].url + 
                                            "'></div><div class='col-xs-3'><div class='description'><br><br id='the-break'><input type='submit' class='btn btn-primary' track-id=" +
                                            trackObj.id + " id='listen' value='LISTEN'><p id='music-text'>" + trackObj.name+ "<br>by " + trackObj.artists[0].name 
                                            + "</p></div></div></div>"); 
                                        marker.addTo(typeLayers[data.type]);

                                    }
                                })
                            } else {
                                //adds marker for shows without artists on spotify
                                marker.bindPopup("<p class='eventTitle'>" + data.displayName + "</p><p class='artists'> Artist(s): " 
                                    + artist.toString() + "</p> Event Date: " + data.start.date + "<br> Venue Name: " + 
                                    data.venue.displayName + "<br><a href='https://maps.google.com?daddr=" + lat + "," + lon + 
                                    "'target='_blank'>Get directions!</a>" + "<br><a href='" + data.uri + "'target='_blank'>Link to event page</a>");
                                marker.addTo(typeLayers[data.type]);                         
                            }

                        }
                    })
                });
                layerControl = L.control.layers(null, typeLayers, {collapsed: false});
                layerControl.addTo(map);
                map.fitBounds(bounds);
            });
        }

        var fetchTracks = function (trackId, callback) {
            $.ajax({
                url: 'https://api.spotify.com/v1/tracks/' + trackId,
                success: function (response) {
                    callback(response);
                }
            });
        };

        var playingCssClass = 'playing';
        var playing = true;
        var audioObject = null;
        var stopped = false;

        $('#map-container').on('click', '#listen', function(e) {
            var target = e.target;
            if (target.classList.contains(playingCssClass)) {
                audioObject = audioObject.pause();
            } else {
                if (audioObject) {
                    audioObject.pause();
                }
                fetchTracks(target.getAttribute('track-id'), function (data) {
                audioObject = new Audio(data.preview_url);
                audioObject.play();
                target.classList.add(playingCssClass);
                audioObject.addEventListener('ended', function () {
                    target.classList.remove(playingCssClass);
                });
                audioObject.addEventListener('pause', function () {
                    target.classList.remove(playingCssClass);
                });
            });
            }
        });

       

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
                            var startDate = angular.element(document.getElementById("startDate"))[0].value;
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