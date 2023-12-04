const width = 800;
const height = 500;

const projection = d3.geoAlbersUsa()
  .scale(1000)
  .translate([width / 2, height / 2]);
   
let svg = d3.select("#map") 
  .attr("width", width) 
  .attr("height", height);

let svg1 = d3.select("#scatterplot") 
  .attr("width", 900) 
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

svg.selectAll("path")
    .data(statesJson.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", d => colorScale(d.properties.medianAQI))
    .attr("stroke", "red"); // Add stroke for better visibility if needed

svg.selectAll("text")
    .data(statesJson.features)
    .enter()
    .append("text")
    .attr("x", d => path.centroid(d)[0])
    .attr("y", d => path.centroid(d)[1])
    .attr("text-anchor", "middle")
    .text(d => d.properties.NAME)
    .attr("font-size", "8px")


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
    });
});
