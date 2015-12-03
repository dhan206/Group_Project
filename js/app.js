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
        var url = "http://api.seatgeek.com/2/events?" 
        var map = L.map('map-container').setView([37.50, -97.00], 4);
        var markers = [];

        L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGhhbjIwNiIsImEiOiJjaWZzeWE4c2QwZDAzdHRseWRkMXR2b2Y5In0.Gbh1YncNoaD5W4zylMfNTw", {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
            maxZoom: 100,
            minZoom: 3,
            id: "mapbox.light",
            accessToken: "pk.eyJ1IjoiZGhhbjIwNiIsImEiOiJjaWZzeWE4c2QwZDAzdHRseWRkMXR2b2Y5In0.Gbh1YncNoaD5W4zylMfNTw"
        }).addTo(map);

        $http.get(url + "venue.state=WA&datetime_utc.gte=2015-12-01&datetime_utc.lte=2015-12-31&per_page=1000").then(function(response) {
            //console.log(response.data.events);
            angular.forEach(response.data.events, function(data) {
                var lat = data.venue.location.lat;
                var lon = data.venue.location.lon;
                var marker = L.circleMarker([lat, lon]);
                marker.setRadius(5);
                var date = new Date(data.datetime_local);
                marker.bindPopup("<p class='eventTitle'>" + data.title + "</p>" + date.getMonth() + "/" + date.getDate() + "/" + date.getFullYear()  + "<br>" + data.venue.name + "<br><a href='https://maps.google.com?daddr=" + lat + "," + lon + "'target='_blank'>Get directions!</a>" + "<br><a href='" + data.url + "'>Seatgeek Listing</a>")
                marker.addTo(map);
                markers.push(marker);
            });
        });

        function getData(params) {
            $http.get(url + params).then(function(response) {
                for (var i = 0; i < markers.length; i++) {
                    map.removeLayer(markers[i]);
                }
                markers = [];
                console.log(response.data.events);
                angular.forEach(response.data.events, function(data) {
                    var lat = data.venue.location.lat;
                    var lon = data.venue.location.lon;
                    var marker = L.circleMarker([lat, lon]);
                    marker.setRadius(5);
                    var date = new Date(data.datetime_local);
                    marker.bindPopup("<p class='eventTitle'>" + data.title + "</p>" + date.getMonth() + "/" + date.getDate() + "/" + date.getFullYear()  + "<br>" + data.venue.name + "<br><a href='https://maps.google.com?daddr=" + lat + "," + lon + "'>Get directions!</a>" + "<br><a href='" + data.url + "'>Seatgeek Listing</a>")
                    marker.addTo(map);
                    markers.push(marker);
                });
            });
        }

        //TODO: MAKE SEPARATE HANDLERS FOR THE 2 DATEPICKERS, MAKE IT LOOK PRETTY, SELECT ONE CHECKBOX DISABLES OTHER 
        $scope.today = new Date();
        $scope.dateStart = new Date();
        $scope.dateEnd = new Date();

        var dd = $scope.today.getDate();
        var mm = $scope.today.getMonth()+1; //January is 0!
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

        $scope.format = 'yyyy-MM-dd';

        $scope.submitForm = function(form) {
            var query = "";
            if ($scope.city) {
                query = query + "venue.city=" + $scope.city + "&";
            }
            if ($scope.state) {
                query = query + "venue.state=" + $scope.state + "&";
            }
            if ($scope.zip) {
                query = query + "venue.postal_code=" + $scope.zip + "&";
            }
            if ($scope.dateStart) {
                var startDate = angular.element(document.getElementById("startDate"))[0].value;
                query = query + "datetime_utc.gte=" + startDate + "&";
            }
            if ($scope.dateEnd) {
                var endDate = angular.element(document.getElementById("endDate"))[0].value;
                query = query + "datetime_utc.lte=" + endDate + "&";
            }
            query = query + "per_page=1000";
            console.log(query); 
            getData(query);
        }

    }])
