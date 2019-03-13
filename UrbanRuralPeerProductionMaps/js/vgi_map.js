/*
Resources:
Basic chloropleth map: Chapter 12 from https://github.com/alignedleft/d3-book
Loading data so that the values can be changed without reloading the JSON: http://bl.ocks.org/rgdonohue/9280446
Basic Legend: http://stackoverflow.com/questions/21838013/d3-choropleth-map-with-legend?rq=1
Dropdown: http://stackoverflow.com/questions/20780835/putting-the-country-on-drop-down-list-using-d3-via-csv-file

TODO: allow local file as in http://bl.ocks.org/hlvoorhees/9d58e173825aed1e0218
*/

var dropdown;
var scaleSwitch;
var scaleSelector;
var svg;
var selector;
var playing = false;
var headerNames;
var currentMap = "US";
var csvFile;
var jsonFile;
var statesFile;
var citiesFile;
var startingVGICol;
var currentData = startingVGICol;
var projection;
var path;
var currentData;
var timer;
var button;
var labels = {"US":"FIPS", "Zh":"RowNum"};
var names = {"US":"CountyName", "Zh":"Prefecture"};
var dataBox;
var scaleType = "Quantile";
var scaleOptions = ["Quantile","Equal Interval","Percent","Standard Deviations","Logged"];
var include_cities = false;
var background_color = "white";
var text_color = "black";
var initialized = false;

var column_descriptions = {};  // array for storing column descriptions
var columnDescriptions;  // file name

var d3select = "#map";
var pos_type = "absolute";
var w;
var h;
var scale;
var s;
var mapwidth;
var windowheight;
var legendwidth;

var legend;
var svgLegend;

//div { outline: #00FF00 dotted thick; }

function computeDimensions() {
    //Width, height, scale, and column names of data                  
    mapwidth = document.getElementById("map").offsetWidth;
    
    windowheight = (window.innerHeight
        || document.documentElement.clientHeight
        || document.body.clientHeight) - 100;                        


    s;
    if (mapwidth*2 > windowheight*3) {
        s = windowheight/2 - 5;
    } else {
        s = mapwidth/3 - 5;
    }

    w = 3*s;
    h = 2*s+50;
    scale = 4*s;

    svgLegend = d3.selectAll("#legendetc")
        .append("svg")
        .attr("width", w/3)
        .attr("height", h/2);
}

//Define scale to sort data values into buckets of color - threshold allows for arbitrary values
//Colors taken from NYTimes
var color = d3.scale.threshold().domain([12.5,25.0,37.5,50.0,62.5,75.0,87.5])
//var color = d3.scale.threshold().domain([1,2,3,4,5,6,7])
    //.range(["rgb(137,0,36)","rgb(182,49,50)","rgb(216, 136, 89)","rgb(244, 212, 137)",
    //        "rgb(202,222,163)","rgb(126,176,161)","rgb(76,127,151)",
    //        "rgb(25,84,115)"]);
    .range(["rgb(236,231,242)","rgb(208,209,230)","rgb(166,189,219)","rgb(116,169,207)",
            "rgb(54,144,192)","rgb(5,112,176)","rgb(4,90,141)",
            "rgb(2,56,88)"]);
    //.range(["rgb(122,1,119)","rgb(174,1,126)","rgb(5,112,178)","rgb(221,52,151)",
    //        "rgb(247,104,161)","rgb(5,112,176)","rgb(250,159,181)",
    //        "rgb(252,197,192)"]);


function updateScale(new_scale_type) {
    scaleType = new_scale_type;
    d3.select("#scalelabel").text(new_scale_type + " ");
    update(headerNames[currentData]);
}    

function changeScale(new_column_name) {
                
    if (scaleType == "Percent") {
        color.domain([12.5,25.0,37.5,50.0,62.5,75.0,87.5]);
        //svgLegend.selectAll(".legendDesc").text("Percent");
    }
    else if (scaleType == "Standard Deviations") {
        color.domain([-2,-1.5,-0.5,0,0.5,1.5,2]);
        //svgLegend.selectAll(".legendDesc").text("Standard Deviations");
    }
    else if (scaleType == "Equal Interval") {

        //svgLegend.selectAll(".legendDesc").text("Equal Interval");

        //Find new min and max and set color domain to them
        var min = Infinity;
        var max = -Infinity;
        d3.selectAll(".counties")
        .each(function (d,i) {
            var currentValue = +d.properties[new_column_name];
            if (currentValue < min) {
                min = currentValue;
            }
            else if (currentValue > max) {
                max = currentValue;
            }
        });
        var num_categories = 8;
        var diff = max - min;
        var one = min + diff/num_categories;
        if (one < 0 && (min + 2*diff/num_categories) > 0) {
            var two = 0;
        } else {
            var two = min + 2*diff/num_categories;
        }
        if (two < 0 && (min + 3*diff/num_categories) > 0) {
            var three = 0;
        } else {
            var three = min + 3*diff/num_categories;
        }
        if (three < 0  && (min + 4*diff/num_categories) > 0) {
            var four = 0;
        } else {
            var four = min + 4*diff/num_categories;
        }
        if (four < 0 && (min + 5*diff/num_categories) > 0) {
            var five = 0;
        } else {
            var five = min + 5*diff/num_categories;
        }
        if (five < 0 && (min + 6*diff/num_categories) > 0) {
            var six = 0;
        } else {
            var six = min + 6*diff/num_categories;
        }
        if (six < 0 && (min + 7*diff/num_categories) > 0) {
            var seven = 0;
        } else {
            var seven = min + 7*diff/num_categories;
        }
        color.domain([one, two, three, four, five, six, seven]);
    }
    else if (scaleType == "Logged") {

        //svgLegend.selectAll(".legendDesc").text("Log Scale");

        //Find new min and max and set color domain to them
        var min = Infinity;
        var max = -Infinity;
        d3.selectAll(".counties")
        .each(function (d,i) {
            var currentValue = +d.properties[new_column_name];
            if (currentValue < min) {
                min = currentValue;
            }
            else if (currentValue > max) {
                max = currentValue;
            }
        });
        var num_categories = 8;
        var diff = Math.log(100*(max - min));

        var one = min + (Math.exp(diff/num_categories) / 100);
        var two = min + (Math.exp(2*diff/num_categories) / 100);
        var three = min + (Math.exp(3*diff/num_categories) / 100);
        var four = min + (Math.exp(4*diff/num_categories) / 100);
        var five = min + (Math.exp(5*diff/num_categories) / 100);
        var six = min + (Math.exp(6*diff/num_categories) / 100);
        var seven = min + (Math.exp(7*diff/num_categories) / 100);
        color.domain([one, two, three, four, five, six, seven]);
    }

    else if (scaleType == "Power") {
        //svgLegend.selectAll(".legendDesc").text("Power Scale");

        //Find new min and max and set color domain to them
        var min = Infinity;
        var max = -Infinity;
        d3.selectAll(".counties")
        .each(function (d,i) {
            var currentValue = +d.properties[new_column_name];
            if (currentValue < min) {
                min = currentValue;
            }
            else if (currentValue > max) {
                max = currentValue;
            }
        });
        var num_categories = 8;
        var diff = Math.pow((max - min), (1/num_categories));

        var one = min + (Math.pow(diff, 1));
        var two = min + (Math.pow(diff, 2));
        var three = min + (Math.pow(diff, 3));
        var four = min + (Math.pow(diff, 4));
        var five = min + (Math.pow(diff, 5));
        var six = min + (Math.pow(diff, 6));
        var seven = min + (Math.pow(diff, 7));
        color.domain([one, two, three, four, five, six, seven]);
    }

    else if (scaleType == "Quantile") {
    
        //svgLegend.selectAll(".legendDesc").text("Quantile");
        //Find new min and max and set color domain to them
        var counts = [];
        d3.selectAll(".counties")
        .each(function (d,i) {
            var currentValue = +d.properties[new_column_name];
            counts.push(currentValue);
        });
        counts.sort(function(a, b) {return a - b;});
        var num_counties = counts.length;
        
        var one = counts[Math.floor(1 * num_counties / 8)];
        var two = counts[Math.floor(2 * num_counties / 8)];
        var three = counts[Math.floor(3 * num_counties / 8)];
        var four = counts[Math.floor(4 * num_counties / 8)];
        var five = counts[Math.floor(5 * num_counties / 8)];
        var six = counts[Math.floor(6 * num_counties / 8)];
        var seven = counts[Math.floor(7 * num_counties / 8)];
        color.domain([one, two, three, four, five, six, seven]);
    }

    else if (scaleType == "QuantMI") {
        //Find new min and max and set color domain to them

        //svgLegend.selectAll(".legendDesc").text("Shrink Tails");

        var counts = [];
        d3.selectAll(".counties")
        .each(function (d,i) {
            var currentValue = +d.properties[new_column_name];
            counts.push(currentValue);
        });
        counts.sort(function(a, b) {return a - b;});
        var num_counties = counts.length;
        
        var one = counts[Math.floor(1 * num_counties / 16)];
        var two = counts[Math.floor(2.5 * num_counties / 16)];
        var three = counts[Math.floor(4.5 * num_counties / 16)];
        var four = counts[Math.floor(7.5 * num_counties / 16)];
        var five = counts[Math.floor(10.5 * num_counties / 16)];
        var six = counts[Math.floor(12.5 * num_counties / 16)];
        var seven = counts[Math.floor(15 * num_counties / 16)];
        color.domain([one, two, three, four, five, six, seven]);
    }

    else if (scaleType == "Halves") {
        var fraction = 1/3;
        //svgLegend.selectAll(".legendDesc").text("Halves");

        //Find new min and max and set color domain to them
        var min = Infinity;
        var max = -Infinity;
        d3.selectAll(".counties")
        .each(function (d,i) {
            var currentValue = +d.properties[new_column_name];
            if (currentValue < min) {
                min = currentValue;
            }
            else if (currentValue > max) {
                max = currentValue;
            }
        });
        var num_categories = 8;
        var diff = (max - min);

        var one = min + (diff * Math.pow(fraction, 7));
        var two = min + (diff * Math.pow(fraction, 6));
        var three = min + (diff * Math.pow(fraction, 5));
        var four = min + (diff * Math.pow(fraction, 4));
        var five = min + (diff * Math.pow(fraction, 3));
        var six = min + (diff * Math.pow(fraction, 2));
        var seven = min + (diff * Math.pow(fraction, 1));
        color.domain([one, two, three, four, five, six, seven]);
    }

    d3.select("#column_title").text(headerNames[currentData]);
    d3.select("#column_desc").text(column_descriptions[headerNames[currentData]]);

    legend.selectAll('.legendText')
        .text(function(d,i) {
            var extent = color.invertExtent(d);
            //extent will be a two-element array
            var format = d3.format("0.2f");
            if (isNaN(format(+extent[0]))) {
                return "< " + format(+extent[1]);
            } else if (isNaN(format(+extent[1]))) {
                return "> " + format(+extent[0]);     
            } else {
            return format(+extent[0]) + " - " + format(+extent[1]);
            }
        });    
}

function setMapInfo(country) {
    if (playing) {
        mapLoop(forcestop=true);
    }    
    if (country == "US") {
        projection = d3.geo.albers()
            .translate([w/2, h/2+30])
            .scale(scale);

        csvFile = "./US_Counties_VGI_Data.csv";
        jsonFile = "./US_Counties.geojson";
        statesFile = "./US_States.geojson";
        citiesFile = "./US_Cities.csv";
        columnDescriptions = "./column_descriptions.csv"
        currentMap = "US";
        startingVGICol = 0;
    }
    else if (country == "Zh") {
        projection = d3.geo.conicConformal()
            .rotate([-104,0])
            .center([0,37.5])
            .parallels(20,51)
            .scale(scale*0.6)
            .translate([w/2, h/2+30]);

        csvFile = "./Zh_Prefectures_VGI_Data.csv";
        jsonFile = "./Zh_Prefectures.geojson";
        statesFile = "./Zh_Provinces.geojson";
        citiesFile = "./Zh_Cities.csv";
        currentMap = "Zh";
        startingVGICol = 0;
    }
    currentData = startingVGICol;
    path = d3.geo.path()
        .projection(projection);
}

//Create svg for map, border, and title
function generateFrame() {
    //Create SVG element for map
    svg = d3.select(d3select)
        .append("svg")
        .attr("width",w)
        .attr("height",h);

}

//Create button for looping through maps
function generatePlayButton() {
    var buttonDiv = d3.select(d3select)
        .append("div")
        .style("position",pos_type)
        .style("top", h - 20 + "px")
        .style("left","180px");
    buttonDiv.append("button")
        .attr("id", "loopButton")
        .attr("type", "button")
        .text("Loop");
    setLoopData();
}

function switchCountry(country) {
    setMapInfo(country);
    loadData();
    currentData = startingVGICol;
    d3.select("#countrylabel").text(country + " ");
}

//Sets loop when loop button is clicked
function setLoopData() {
    button = d3.select("#loopButton");
    button.on('click', mapLoop);
}

function mapLoop() {
    if (playing == false) {  // if the map is currently playing
        nextMap();
        timer = setInterval(nextMap, loopSpeed_ms);
        button.text('Stop');  // change the button label to stop
        playing = true;   // change the status of the animation
    } else {    // else if is currently playing
        clearInterval(timer);   // stop the animation by clearing the interval
        button.text('Loop');   // change the button label to play
        playing = false;   // change the status again
    }
}

function nextMap() {
    if (currentData < headerNames.length - 1) {
        currentData += 1;
    } else {
        currentData = startingVGICol;  // or reset it to start
    }
    update(headerNames[currentData]);  // update representation of the map
}

function initializeMap(countyGeom, stateGeom) {
    //Create paths for each JSON and set colors to first data column
    var counties = svg.selectAll(".counties")
        .data(countyGeom.features);
    counties
        .enter()
        .append("path");
    counties
        .exit()
        .remove();
    counties
        .attr("d", path)
        .attr("id", function(d) {return d.properties[labels[currentMap]]})
        .attr("class", "counties")
        .style("stroke", background_color)
        .style("stroke-width",0.5)
        .style("fill", function(d) {
            //Get data value
            var value = +d.properties[headerNames[startingVGICol]];
            if (value) {
                //If value exists…
                return color(value);
            } else {
                //If value is undefined…
                return "#000";
            }
        })
        .on('click', function(d) {alert(headerNames[currentData] + ":\n\t" +
                                      d.properties[names[currentMap]] + ": " +
                                      Math.round(d.properties[headerNames[currentData]]*1000)/1000 )})
        .on('mouseover', function(d) {d3.select("#dataValue")
                                      .text(Math.round(d.properties[headerNames[currentData]]*1000)/1000)
                                  d3.select("#placeValue")
                                      .text(d.properties[names[currentMap]])});

    var states = svg.selectAll(".states")
        .data(stateGeom.features);
    states
        .enter()
        .append("path");
    states
        .exit()
        .remove();
    states
        .attr("d", path)
        .attr("id", function(d) {return d.properties.STATE_NAME})
        .attr("class", "states")
        .style("fill", "none")
        .style("stroke", background_color)
        .style("stroke-width", 1);

//    var circles = svg.selectAll(".cities")
//        .data(cities);
//    circles
//        .enter()
//        .append("circle");
//    circles
//        .exit()
//        .remove();
//    circles
//        .attr("class", "cities")
//        .attr("cx", function(d) { return projection([+d.Lon,+d.Lat])[0]})
//        .attr("cy", function(d) { return projection([+d.Lon,+d.Lat])[1]})
//        .attr("r",2)
//        .style("stroke", background_color)
//        .style("fill", background_color);
        
    // Set dropdown to correct value to match the map                    
    //d3.select("#mapsdropdown").text(headerNames[startingVGICol]);
}

function initializeLegendAndTitle() {
    //Create legend in bottom right corner

    legend = svgLegend.selectAll('g.legendEntry')
            .data(color.range())
            .enter()
            .append('g')
            .attr('class', 'legendEntry');
    
    var legendStartY = 30;
    var legendStartX = 0;
    var legendBuffer = Math.min(((h/2) - 60) / 8, 30);
    var legendHeight = 0;
    var legendBoxWidth = 180;
    var fontsize = "medium";
    if (s < 275) {
        var fontsize = "small";
//        svg.selectAll(".cities")
//            .attr("display", "none");
//        return;
   }

    //var legendTitle = svgLegend.selectAll('#legendTitle')
    //        .data([headerNames[currentData]])
    //        .enter()
    //        .append("text")
    //        .attr("x", legendStartX)
    //        .attr("y", legendStartY - 20)
    //        .attr("font-size", "medium")
    //        .attr("id", "legendTitle");

    d3.select("#column_title").text(headerNames[currentData]);
    d3.select("#column_desc").text(column_descriptions[headerNames[currentData]]);
        

    legend
        .append('rect')
        .attr('class', 'legendSymbol')
        .attr("x", legendStartX)
        .attr("y", function(d, i) {
            legendHeight = legendHeight + legendBuffer;
            return (legendStartY) + (i * legendBuffer);
        })
        .attr("width", legendBuffer/2)
        .attr("height", legendBuffer/2)
        .style("stroke", text_color)
        .style("stroke-width", 1)
        .style("fill", function(d){return d;});
        //the data objects are the fill colors

    legend
        .append('text')
        .attr('class','legendText')
        .attr("x", legendStartX + legendBuffer/2 + 5) //leave 5 pixel space after the <rect>
        .attr("y", function(d, i) { return (legendStartY) + (i * legendBuffer);})
        .attr("dy", "0.7em") //place text in line with the color
        .attr("font-size",fontsize)
        .attr("fill", text_color)
        .text(function(d,i) {
            var extent = color.invertExtent(d);
            //extent will be a two-element array
            var format = d3.format("0.2f");
            if (isNaN(format(+extent[0]))) {
                return "< " + format(+extent[1]);
            } else if (isNaN(format(+extent[1]))) {
                return "> " + format(+extent[0]);     
            }
            return format(+extent[0]) + " - " + format(+extent[1]);
        });

    if (!include_cities) {
        legendHeight = legendHeight - legendBuffer;
    }

    if (include_cities) {
        var cityDot = svg.selectAll("g.cityDot")
            .data([1])
            .enter()
            .append("g")
            .attr("class","cityDot");
        cityDot
            .append("circle")
            .attr("cx", legendStartX + 5)
            .attr("cy", legendStartY + legendHeight + 3)
            .attr("fill", text_color)
            .attr("r", 5);
        cityDot
            .append("text")
            .attr("class","citylabel")
            .attr("x", legendStartX + legendBuffer/2 + 5)
            .attr("y", legendStartY + legendHeight - 3)
            .attr("dy", "0.7em")
            .attr("font-size",fontsize)
            .attr("fill", text_color)
            .text("Major Cities");
    }
}

function update(new_column_name) {
    //When dropdown switched: change scale, recolor map, change legend and title
    currentData = headerNames.indexOf(new_column_name);
    //d3.select("#legendTitle").text(new_column_name);    
    
    changeScale(new_column_name);
    
    d3.selectAll('.counties')
        .transition()
        .duration(250)
        .style("fill", function(d) {
            //Get data value
            var value = d.properties[new_column_name];
            if (value) {
                //If value exists…
                return color(value);
            } else {
                //If value is undefined…
                return "#000";
            }
        });
}

var page_description = "These series of maps are an exploration of data on the quantity and quality of content in peer-production systems.\\n\\n" +
"They were generated by Isaac Johnson, PhD student at the University of Minnesota. Direct all comments/questions/thoughts to ijohnson@cs.umn.edu.\\n\\n" +
"Thanks and enjoy!";

var title_text = "Peer Production and the Urban-Rural Divide";
