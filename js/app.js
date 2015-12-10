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
        var map = L.map('map-container').locate({setView: true, enableHighAccuracy: true});
        var songKickApiKey = "HqtbfXIKRDQWYRLi";
        var url = "http://api.songkick.com/api/3.0/events.json?apikey=" + songKickApiKey;
        var layerControl;
        var typeLayers = {};
        $scope.alert = false;

        L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGhhbjIwNiIsImEiOiJjaWZzeWE4c2QwZDAzdHRseWRkMXR2b2Y5In0.Gbh1YncNoaD5W4zylMfNTw", {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            maxZoom: 18,
            minZoom: 8,
            id: "mapbox.emerald",
            accessToken: "pk.eyJ1IjoiZGhhbjIwNiIsImEiOiJjaWZzeWE4c2QwZDAzdHRseWRkMXR2b2Y5In0.Gbh1YncNoaD5W4zylMfNTw"
        }).addTo(map);

        map.scrollWheelZoom.disable();

        // Adds a red circle marker to the user's location if available.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                var userLocation = L.circleMarker([position.coords.latitude, position.coords.longitude], {color: "red", fillColor: "red", opacity: 1, fillOpacity: .4});
                userLocation.setRadius(4);
                userLocation.bindPopup("<h6>You are here.</h6>");
                userLocation.addTo(map);
            });
        }

        $scope.eventData = [];

        function fillMap(param) {
            $http.jsonp(url + param)
                .success(function (response) {
                if(response.resultsPage.totalEntries != 0) {
                    $scope.eventData = [];

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

                        data.performance.forEach(function (performance) {
                            artist.push(" " + performance.artist.displayName);
                        });

                        $scope.eventData.push(data);

                        var milTime = data.start.time;
                        var standardTime;
                        if (milTime == null) {
                            standardTime = 'Not specified';
                        } else {
                            standardTime = milToStandard(milTime);
                        }
                        function milToStandard(value) {
                            if (value !== null && value !== undefined) { //If value is passed in
                                if (value.indexOf('AM') > -1 || value.indexOf('PM') > -1) { //If time is already in standard time then don't format.
                                    return value;
                                }
                                else {
                                    if (value.length == 8) { //If value is the expected length for military time then process to standard time.
                                        var hour = value.substring(0, 2); //Extract hour
                                        var minutes = value.substring(3, 5); //Extract minutes
                                        var identifier = 'AM'; //Initialize AM PM identifier

                                        if (hour == 12) { //If hour is 12 then should set AM PM identifier to PM
                                            identifier = 'PM';
                                        }
                                        if (hour == 0) { //If hour is 0 then set to 12 for standard time 12 AM
                                            hour = 12;
                                        }
                                        if (hour > 12) { //If hour is greater than 12 then convert to standard 12 hour format and set the AM PM identifier to PM
                                            hour = hour - 12;
                                            identifier = 'PM';
                                        }
                                        return hour + ':' + minutes + ' ' + identifier; //Return the constructed standard time
                                    }
                                    else { //If value is not the expected length than just return the value as is
                                        return value;
                                    }
                                }
                            }
                        };

                        var ageLimit;
                        if (data.ageRestriction == null) {
                            ageLimit = "Not specified";
                        } else {
                            ageLimit = data.ageRestriction;
                        }

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

                                            // adds markers for shows with artists on  spotify
                                            marker.bindPopup("<p class='eventTitle'>" + data.displayName + "</p> <strong>Artist(s):</strong> " + artist.toString() + "<br><strong>Event Date:</strong> " + data.start.date + "<br><strong>Start Time:</strong> " + standardTime + "<br><strong> Age Restriction:</strong> " + ageLimit + "<br> <strong>Venue Name:</strong> " + data.venue.displayName + "<br><a href='https://maps.google.com?daddr=" + lat + "," + lon + "'target='_blank'>Get directions!</a>" + "<br><a href='" + data.uri + "'target='_blank'>Link to event page</a>" +
                                                "<div class='container popup'><div class='row'><div class='col-xs-1'><img class='cover' src='" + trackObj.album.images[0].url +
                                                "'></div><div id='description'><br><br id='the-break'><input type='submit' class='btn btn-primary' track-id=" +
                                                trackObj.id + " id='listen' value='LISTEN'><p id='music-text'>" + trackObj.name + "<br>by " + trackObj.artists[0].name
                                                + "</p></div></div></div>");
                                            marker.addTo(typeLayers[data.type]);

                                        }
                                    })
                                } else {
                                    //adds marker for shows without artists on spotify
                                    marker.bindPopup("<p class='eventTitle'>" + data.displayName + "</p> <strong>Artist(s):</strong> " + artist.toString() + "<br><strong>Event Date:</strong> " + data.start.date + "<br><strong>Start Time:</strong> " + standardTime + "<br><strong> Age Restriction:</strong> " + ageLimit + "<br> <strong>Venue Name:</strong> " + data.venue.displayName + "<br><a href='https://maps.google.com?daddr=" + lat + "," + lon + "'target='_blank'>Get directions!</a>" + "<br><a href='" + data.uri + "'target='_blank'>Link to event page</a>");
                                    marker.addTo(typeLayers[data.type]);
                                }

                            }
                        })
                    });
                    console.log($scope.eventData);
                    layerControl = L.control.layers(null, typeLayers, {collapsed: false});
                    layerControl.addTo(map);
                    map.fitBounds(bounds);
                } else {
                    var startDate = document.getElementById("startDate").value;
                    var endDate = document.getElementById("endDate").value;
                    $scope.alert = true;
                    $scope.alertTitle = "NO RESULTS FOUND.";
                    $scope.alertMessage = "We're sorry, we could not find any concerts in " + $scope.city + " for the date range between " + startDate + " and " + endDate + ". Please try again.";
                }
            })
                .error(function(response) {
                    $scope.alert = true;
                    $scope.alertTitle = "Something went wrong.";
                    $scope.alertMessage = response.data + " this error occurred. Please try again.";
                })
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

        $('#map-container').on('click', function (e) {
            console.log("hey")

            if (audioObject) {
                audioObject = audioObject.pause();
            }
            var target = e.target;
            if (target.classList.contains(playingCssClass)) {
                audioObject = audioObject.pause();
            } 
        });


        $scope.locate = function(data) {

            var artist = [];
            data.performance.forEach(function(performance) {
                artist.push(" " + performance.artist.displayName);
            });

            var lat = data.location.lat;
            var lon = data.location.lng;

            var milTime = data.start.time;
            var standardTime;
            if (milTime == null) {
                standardTime = 'Not specified';
            } else {
                standardTime = milToStandard(milTime);
            }
            function milToStandard(value) {
                if (value !== null && value !== undefined){ 
                    if(value.indexOf('AM') > -1 || value.indexOf('PM') > -1){ 
                      return value;
                    }
                    else {
                      if(value.length == 8){ 
                        var hour = value.substring ( 0,2 ); 
                        var minutes = value.substring ( 3,5 ); 
                        var identifier = 'AM'; 

                        if(hour == 12){ 
                          identifier = 'PM';
                        }
                        if(hour == 0){ 
                          hour=12;
                        }
                        if(hour > 12){ 
                          hour = hour - 12;
                          identifier='PM';
                        }
                        return hour + ':' + minutes + ' ' + identifier; 
                      }
                      else { 
                        return value;
                      }
                    }
                }
            };

            var ageLimit;
            if (data.ageRestriction == null) {
                ageLimit = "Not specified";
            } else {
                ageLimit = data.ageRestriction;
            }
            var popup = L.popup()
                .setLatLng(L.latLng(data.location.lat, data.location.lng))
                .setContent("<p class='eventTitle'>" + data.displayName + "</p> <strong>Artist(s):</strong> " + artist.toString() + "<br><strong>Event Date:</strong> " + data.start.date + "<br><strong>Start Time:</strong> " + standardTime + "<br><strong> Age Restriction:</strong> " + ageLimit + "<br> <strong>Venue Name:</strong> " + data.venue.displayName + "<br><a href='https://maps.google.com?daddr=" + lat + "," + lon + "'target='_blank'>Get directions!</a>" + "<br><a href='" + data.uri + "'target='_blank'>Link to event page</a>")
                .openOn(map);
            console.log(data);


        };

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
        };

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
            $scope.alert = false;


            if ($scope.city) {

                // Gets the metroID using the inputted city name. A requirement from songkick's api
                $http.jsonp("http://api.songkick.com/api/3.0/search/locations.json?apikey=" + songKickApiKey + "&query=" + $scope.city + "&per_page=1&jsoncallback=JSON_CALLBACK")
                    .success(function (response) {
                        if (response.resultsPage.totalEntries != 0) {
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

                            query += "&per_page=100&jsoncallback=JSON_CALLBACK";

                            fillMap(query);
                        } else {
                            $scope.alert = true;
                            $scope.alertTitle = "CITY NOT FOUND.";
                            $scope.alertMessage = "The city you have entered may be misspelled or does not exist in our database. Please try again.";
                        }
                    })
                    .error(function(response) {
                        $scope.alert = true;
                        $scope.alertTitle = "Something went wrong.";
                        $scope.alertMessage = response.data + " this error occurred. Please try again.";
                    });
            }

        }
    }])
