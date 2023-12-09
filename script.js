const width = 800;
const height = 500;

const projection = d3.geoAlbersUsa()
  .scale(1000)
  .translate([width / 2, height / 2]);
   
let svg = d3.select("#map") 
 
let svg1 = d3.select("#scatterplot") 

let svg2=d3.select("#interState");

let svg3=d3.select("#piechart");
const path = d3.geoPath()
  .projection(projection);

// Load GeoJSON data
d3.json("us_states_data.json").then(function (statesJson) {

    // Load AQI dataset
    d3.csv("annual_aqi_by_county_2022.csv").then(function (aqiData) {

       d3.csv("population_density.csv").then(function (populationData) {

        // Aggregate median AQI for each state
        const stateMedians = d3.rollups(aqiData,
            v => d3.median(v, d => +d.Median_AQI), // Calculate median AQI for counties within each state
            d => d.State // Group data by state
        );
        console.log("State Medians:", stateMedians); // Check state medians in the console

        // Normalize state names in the GeoJSON data
        const normalizedGeoJSONStateNames = new Set(statesJson.features.map(state => state.properties.NAME.toUpperCase().trim()));

        // Filter stateMedians to include only the states present in the GeoJSON (using normalized names)
        const filteredStateMedians = stateMedians
            .filter(([state]) => normalizedGeoJSONStateNames.has(state.toUpperCase().trim())) // Uppercase state names for consistency
            .map(([state, medianAQI]) => [state.toUpperCase().trim(), medianAQI]); // Uppercase state names for consistency

        console.log("Filtered State Medians:", filteredStateMedians); // Check filtered state medians in the console

// Normalize state names in the AQI data
const filteredStateNames = new Set(filteredStateMedians.map(([state]) => state.toUpperCase().trim()));


        // Create a Map to store state medians
        const stateMediansMap = new Map(filteredStateMedians);

        // Merge state medians into GeoJSON
        statesJson.features.forEach(function (state) {
            const stateName = state.properties.NAME.toUpperCase().trim(); // Access state name from GeoJSON properties
            const medianAQI = stateMediansMap.get(stateName);
            console.log(stateName, medianAQI); // Log state name and corresponding medianAQI
            state.properties.medianAQI = medianAQI || 0; // Use 0 if no AQI data is found for the state
        });

        // Color scale
        const colorScale = d3.scaleSequential()
            .interpolator(d3.interpolateOranges)
            .domain([20, 100]);

console.log(statesJson.features);
svg.selectAll("path")
    .data(statesJson.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", d => colorScale(d.properties.medianAQI))
    .attr("stroke", "red");
    

svg.selectAll("text")
    .data(statesJson.features)
    .enter()
    .append("text")
    .attr("x", d => path.centroid(d)[0])
    .attr("y", d => path.centroid(d)[1])
    .attr("text-anchor", "middle")
    .text(d => d.properties.NAME)
    .attr("font-size", "8px");

//Adding legend to the heat map
// Create a legend
const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(700,400)"); // Adjust position of the legend

const legendWidth = 150;
const legendHeight = 20;
const numColorBands = 10;

const legendScale = d3.scaleLinear()
    .domain([20, 100]) // Use the same domain as your color scale
    .range([0, legendWidth]);

const legendAxis = d3.axisBottom(legendScale)
    .tickValues(d3.range(20, 101, 10)) // Adjust tick values as needed
    .tickSize(legendHeight);

legend.append("g")
    .attr("class", "legend-axis")
    .attr("transform", "translate(0," + legendHeight + ")")
    .call(legendAxis);

legend.selectAll(".legend-rect")
    .data(d3.range(20, 101, (100 - 20) / numColorBands)) // Create color bands
    .enter().append("rect")
    .attr("class", "legend-rect")
    .attr("x", d => legendScale(d))
    .attr("y", 0)
    .attr("width", legendWidth / numColorBands)
    .attr("height", legendHeight)
    .attr("fill", d => colorScale(d));


//Adding onclick functionality
svg.selectAll('path')
    .on("click", function(d) {
          // Hide charts
document.getElementById("remote").style.display="none";
  d3.select("#charts")
  .style("display", "none");

// Show interState 
d3.select("#state")
  .style("display", "block");
        let r=d.srcElement.__data__.properties.NAME;
        interStateData(r);
                });

//Rank table 
// Sort the states by median AQI in ascending order
const sortedStates = statesJson.features.slice().sort((a, b) => {
    const aMedianAQI = a.properties.medianAQI || 0;
    const bMedianAQI = b.properties.medianAQI || 0;
    return aMedianAQI - bMedianAQI;
});
console.log(sortedStates);
// Create a table for state ranking based on median AQI
const table = d3.select("#ranking-table")
    .append("table")
    .attr("id", "ranking-table");

// Add table headers
const headers = table.append("thead")
    .append("tr");
headers.append("th").text("Rank");
headers.append("th").text("State");
headers.append("th").text("Median AQI");

// Add table rows
const rows = table.append("tbody")
    .selectAll("tr")
    .data(sortedStates)
    .enter()
    .append("tr");

// Populate the table with state ranking based on median AQI
rows.each(function (state, index) {
    const row = d3.select(this);
    const rank = index + 1;
    const stateName = state.properties.NAME;
    const medianAQI = state.properties.medianAQI || 0;

    row.append("td").text(rank);
    row.append("td").text(stateName);
    row.append("td").text(medianAQI);
});

//Scatter plot Code
// Mapping state names to population density
const statePopulationMap = new Map(populationData.map(d => [d.State.toUpperCase().trim(), +d.Population_density]));

// Filter population density data for states present in median AQI
 const filteredPopulationData = populationData.filter(d => filteredStateNames.has(d.State.toUpperCase().trim()));
console.log(filteredPopulationData);

// Now, let's define the margin for the scatter plot
const scatterMargin = { top: 20, right: 30, bottom: 80, left: 120 };
const scatterWidth = width - scatterMargin.left - scatterMargin.right;
const scatterHeight = height - scatterMargin.top - scatterMargin.bottom;

// Creating scatter plot
const xScale = d3.scaleLinear()
    .domain(d3.extent(filteredStateMedians, d => d[1])) // Using median AQI for x-axis
    .range([scatterMargin.left,scatterMargin.left + scatterWidth]);

const yScale = d3.scaleLinear()
    .domain(d3.extent(filteredPopulationData, d => +d.Population_density)) // Using population density for y-axis
    .range([scatterMargin.top + scatterHeight, scatterMargin.top]);

console.log(filteredStateMedians)


// Calculate total height needed based on the number of lines to display
const numLines = 3; // Adjust as per your content
const lineHeight = 25; // Adjust line height as needed
const totalHeight = numLines * lineHeight;

// Creating a textarea with adjusted height
const textarea = svg1.append("foreignObject")
    .attr("x", 400) // Adjust positioning as needed
    .attr("y", scatterMargin.top)
    .attr("width", 200)
    .attr("height", totalHeight) // Set the total height
    .append("xhtml:textarea")
    .attr("class", "state-textarea")
    .style("font-size", "12px")
    .style("padding", "12px")
    .attr("readonly", true); // Make it read-only initially

// Adding circles to the scatterplot
svg1.selectAll("circle")
    .data(filteredStateMedians)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d[1]))
    .attr("cy", d => yScale(statePopulationMap.get(d[0])))
    .attr("r", 5)
    .attr("fill", "steelblue")
    .attr("opacity", 0.7)
    .on("click", function(event, d) {
        const stateName = d[0];
        const medianAQI = d[1];
        const populationDensity = statePopulationMap.get(d[0]);
        
        textarea.node().value = `State: ${stateName}\nMedian AQI: ${medianAQI}\nPopulation Density: ${populationDensity}`;
    });

// Create x-axis
const xAxis = d3.axisBottom(xScale).ticks(5);
svg1.append("g")
    .attr("transform", `translate(0, ${scatterMargin.top + scatterHeight})`)
    .call(xAxis);

// Create y-axis
const yAxis = d3.axisLeft(yScale).ticks(5);
svg1.append("g")
    .attr("transform", `translate(${scatterMargin.left}, 0)`)
    .call(yAxis);

// Label for x-axis
svg1.append("text")
    .attr("transform", `translate(${width / 2}, ${height - scatterMargin.bottom / 2})`)
    .style("text-anchor", "middle")
    .text("Median AQI");

// Label for y-axis
svg1.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", scatterMargin.left / 2)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Population Density");
    

// Set SVG dimensions & margins
const svgWidth = 1250;
const svgHeight = 550;
const margin = {top: 20, right: 20, bottom: 40, left: 100}; 

// Data processing
function interStateData(x){

    svg2.selectAll("*").remove();
svg3.selectAll("*").remove();
document.getElementById("nametag").innerHTML=x;
let alaData = aqiData.filter(d => d.State === x);

let counties = [...new Set(alaData.map(d => d.County))];

let metrics = [
  "Days with AQI",
  "Good Days", 
  "Moderate Days",
  "Unhealthy for Sensitive Groups Days",
  "Unhealthy Days",
  "Very Unhealthy Days", 
  "Hazardous Days"
  
];

// Create scales
let xScale1 = d3.scaleBand()
    .domain(counties)
    .range([margin.left, svgWidth - margin.right])
    .padding(0.1);

// Assuming your data variable contains all the AQI data for different counties
let maxDays = d3.max(alaData, d => +d['Days with AQI']);

let yScale1 = d3.scaleLinear()
    .domain([0, maxDays]) 
    .range([svgHeight - margin.bottom, margin.top]);

// Draw bars
svg2.selectAll("g")
  .data(alaData)
  .enter()
  .append("g")
  .attr("transform", d => "translate(" + xScale1(d.County) + ",0)")
  .selectAll("rect")
  .data(d => metrics.map(metric => ({ metric: metric, value: d[metric] })))
  .enter()
  .append("rect")
  .attr("x", (d, i) => xScale1.bandwidth() / metrics.length * i) // Set the x position for each bar within a group
  .attr("y", d => yScale1(d.value)) // Set the y position based on the value
  .attr("width", xScale1.bandwidth() / metrics.length) // Set the width of each bar
  .attr("height", d => svgHeight - margin.bottom - yScale1(d.value)) // Set the height of the bar
  .attr("fill", (d, i) => {
    // Apply different colors for each metric
    const colors = ["steelblue", "orange", "green", "red", "purple", "yellow","black"];
    return colors[i];
  });


// X & Y axes
let xAxis = d3.axisBottom(xScale1);
let yAxis = d3.axisLeft(yScale1)  

let xaxis= svg2.append("g")
    .attr("transform", "translate(0," + (svgHeight - margin.bottom) + ")")
    .call(xAxis);

xaxis.selectAll("text")
    .style("text-anchor", "end")
    .attr("transform", "rotate(-45)");
svg2.append("g")
    .attr("transform", "translate(" + margin.left + ",0)")
    .call(yAxis);  

    
// Define metrics and their corresponding colors
const metricColors = {
  "Days with AQI": "steelblue",
  "Good Days": "orange", 
  "Moderate Days": "green",
  "Unhealthy for Sensitive Groups Days": "red",
  "Unhealthy Days":"purple",
  "Very Unhealthy Days": "yellow", 
  "Hazardous Days":"black"
};

// Create legend
const legend = svg2.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

let legendOffset = 0;
const legendSpacing = 20;

// Draw colored rectangles and labels for each metric
Object.entries(metricColors).forEach(([metric, color]) => {
  // Draw colored rectangles
  legend.append("rect")
    .attr("x", 880)
    .attr("y", legendOffset)
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", color);

  // Add labels for metrics
  legend.append("text")
    .attr("x", 900)
    .attr("y", legendOffset +6)
    .text(metric)
    .style("font-size", "12px")
    .attr("alignment-baseline", "middle");

  // Increment offset for the next legend item
  legendOffset += legendSpacing;
});


// Pie chart data
let pieMetrics = ["Days CO", "Days NO2", "Days Ozone", "Days PM2.5", "Days PM10"];  

let pieData = pieMetrics.map(m => ({
    metric: m,
    value: d3.mean(alaData, d => d[m])   
}));

// Draw pie chart 
let radius = 100;
let pie = d3.pie()
    .value(d => d.value);
// Define colors
let colors = d3.scaleOrdinal()
    .domain(pieMetrics)
    .range(d3.schemeCategory10); // You can change the color scheme as needed
let colors1 = ["steelblue", "orange", "green", "red", "purple", "yellow","black"];
let arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

    let pieGroup = svg3.append("g")
    .attr("transform", "translate(150, 150)");

let arcs = pieGroup.selectAll("arc")
    .data(pie(pieData))
    .enter()
    .append("g");

arcs.append("path")
    .attr("d", arc)
    .style("fill", (d, i) => colors(d.data.metric)); // Use the color scale for each metric


// Add labels
arcs.append("text")
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .attr("dy", "0.35em")
    .style("text-anchor", "middle");

// Add title
svg3.append("text")
    .attr("x", 170)
    .attr("y", 20)
    .text("Days by Pollutant")
    .style("font-size", "20px")
    .style("text-anchor", "middle")
    .style("font-weight", "bold");

// Create legend
let legend1 = svg3.append("g")
    .attr("transform", "translate(280, 100)")
    .selectAll(".legend")
    .data(pieData)
    .enter().append("g")
    .attr("class", "legend")
    .attr("transform", (d, i) => `translate(0, ${i * 20})`);

legend1.append("rect")
    .attr("x", 0)
    .attr("width", 10)
    .attr("height", 10)
    .style("fill", (d, i) => colors1[i]);

legend1.append("text")
    .attr("x", 20)
    .attr("y", 5)
    .text(d => d.metric)
    .style("font-size", "12px")
    .attr("alignment-baseline", "middle");

}
       })
    })
});