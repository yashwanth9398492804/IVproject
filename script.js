const width = 800;
const height = 500;

const projection = d3.geoAlbersUsa()
  .scale(1000)
  .translate([width / 2, height / 2]);
   
let svg = d3.select("#map") 
  .attr("width", width) 
  .attr("height", height);

let svg1 = d3.select("#scatterplot") 
  .attr("width", 1200) 
  .attr("height", height);

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

const data= statesJson.features;
svg.selectAll('path')
    .on("click", function(d) {
    console.log(d);
                });



// Sort the states by median AQI in ascending order
const sortedStates = statesJson.features.slice().sort((a, b) => {
    const aMedianAQI = a.properties.medianAQI || 0;
    const bMedianAQI = b.properties.medianAQI || 0;
    return aMedianAQI - bMedianAQI;
});
console.log(sortedStates);
// Create a table for state ranking based on median AQI
const table = d3.select("body")
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
    .append("tr")
    .on("click",function(d){
        console.log(d);
        const state = d.properties.NAME;
    console.log("Clicked state: " + state);
    });

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

// Mapping state names to population density
const statePopulationMap = new Map(populationData.map(d => [d.State.toUpperCase().trim(), +d.Population_density]));

// Filter population density data for states present in median AQI
 const filteredPopulationData = populationData.filter(d => filteredStateNames.has(d.State.toUpperCase().trim()));
console.log(filteredPopulationData);

// Now, let's define the margin for the scatter plot
const scatterMargin = { top: 20, right: 30, bottom: 80, left: 120 };
const scatterWidth = width - scatterMargin.left - scatterMargin.right;
const scatterHeight = height - scatterMargin.top - scatterMargin.bottom;

// Define Tooltip
const tooltip = d3.select("#scatterplot")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Add tooltip text to the tooltip div
tooltip.append("span")
  .attr("class", "tooltiptext");

// Creating scatter plot
const xScale = d3.scaleLinear()
    .domain(d3.extent(filteredStateMedians, d => d[1])) // Using median AQI for x-axis
    .range([scatterMargin.left,scatterMargin.left + scatterWidth]);

const yScale = d3.scaleLinear()
    .domain(d3.extent(filteredPopulationData, d => +d.Population_density)) // Using population density for y-axis
    .range([scatterMargin.top + scatterHeight, scatterMargin.top]);

console.log(filteredStateMedians)

svg1.selectAll("circle")
    .data(filteredStateMedians)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d[1]))
    .attr("cy", d => yScale(statePopulationMap.get(d[0])))
    .attr("r", 5)
    .attr("fill", "steelblue")
    .attr("opacity", 0.7)
    .on("mouseover", function(event, d) {
        const tooltipText = `<strong>State:</strong> ${d[0]}`;
        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
        tooltip.select(".tooltiptext")
          .html(tooltipText)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
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
        });
    

// Set SVG dimensions & margins
const svgWidth = 1200;
const svgHeight = 800;
const margin = {top: 20, right: 20, bottom: 40, left: 100}; 

// Create SVG  
const svg2 = d3.select("body")
  .append("svg")
    .attr("width", svgWidth)  
    .attr("height", svgHeight);

// Data processing
let alaData = aqiData.filter(d => d.State === "Alabama");
console.log(alaData);
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

//let data= ;
// Assuming your data variable contains all the AQI data for different counties
let maxDays = d3.max(alaData, d => +d['Days with AQI']);
console.log(maxDays);

let yScale1 = d3.scaleLinear()
    .domain([0, maxDays]) 
    .range([svgHeight - margin.bottom, margin.top]);

 
// Draw bars
// Draw bars 
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

svg2.append("g")
    .attr("transform", "translate(0," + (svgHeight - margin.bottom) + ")")
    .call(xAxis);

svg2.append("g")
    .attr("transform", "translate(" + margin.left + ",0)") 
    .call(yAxis);  

//Creating the legend for the bar Chart
// Define metrics and their corresponding colors
const metricColors = {
  "Days with AQI": "steelblue",
  "Good Days": "orange", 
  "Moderate Days": "green",
  "Unhealthy for Sensitive Groups Days": "red",
  "Unhealthy Days":"purple",
  "Very Unhealthy Days": "yellow", 
  "Hazardous Days":"black"
  // ... add other metrics and their colors
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
let pieMetrics = ["DaysCO", "DaysNO2", "DaysOzone", "DaysPM2.5", "DaysPM10"];  

let pieData = pieMetrics.map(m => ({
    metric: m,
    value: d3.mean(alaData, d => d[m])   
}));

// Draw pie chart 
let radius = 100;
let pie = d3.pie()
    .value(d => d.value);
    
let arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

let pieGroup = svg2.append("g")
    .attr("transform", "translate(200, 170)"); 
    
let arcs = pieGroup.selectAll("arc")
    .data(pie(pieData)) 
    .enter()
    .append("g");
    
arcs.append("path")
    .attr("d", arc) 
    .style("fill", (d, i) => colors[i]); 

// Add labels, title, legend

    })
});