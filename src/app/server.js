require('dotenv').config(); // Load environment variables
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');

// Create a new cache instance with a default TTL (time-to-live) of 60 minutes
const cacheTTL = process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 60; // Default to 60 minutes if not set
const cache = new NodeCache({ stdTTL: cacheTTL * 60 }); // Convert minutes to seconds

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/api/1/matrix', async (req, res) => {
  const { from_points, to_points, out_arrays } = req.body; // Get coordinates from the request body
  const key = req.query.key; // Expect API key inimes', 'distan the URL query parameters
  // Check for valid API key
  if (!key || key !== process.env.API_KEY) {
    return res.status(403).json({ message: 'Forbidden: Invalid API key' });
  }

  // Validate coordinates
  const isValidCoordinate = (coord) => {
    return (
      Array.isArray(coord) &&
      coord.length === 2 &&
      typeof coord[0] === 'number' &&
      typeof coord[1] === 'number'
    );
  };

  // Check validity of from_points and to_points
  if (
    !Array.isArray(from_points) ||
    !Array.isArray(to_points) ||
    !from_points.every(isValidCoordinate) ||
    !to_points.every(isValidCoordinate)
  ) {
    return res.status(400).json({ message: 'Invalid coordinate format' });
  }

  // Convert to [lng, lat]
  const fromCoords = from_points //.map(coord => coord.reverse()); // Convert to [lng, lat]
  const toCoords = to_points //.map(coord => coord.reverse());     // Convert to [lng, lat]
  const annotations = out_arrays

  // Create the string with 'lng,lat' format
  const coordinates = [...fromCoords, ...toCoords]
    .map(coord => coord.join(',')) // Join pairs with a comma
    .join(';');                   // Use semicolons to separate the coordinate pairs

  // Create sources and destinations indices as semicolon-separated strings
  const sources = fromCoords.map((_, index) => index).join(';'); // Indices of from_points
  const destinations = toCoords.map((_, index) => fromCoords.length + index).join(';'); // Indices of to_points

  // Construct the URL with the correct coordinate format
  const baseUrl = process.env.BASE_URL;
  const url = `${baseUrl}/table/v1/driving/${coordinates}?sources=${sources}&destinations=${destinations}&annotations=duration,distance`;

  // Check if the response is cached
  const cachedResponse = cache.get(url);
  if (cachedResponse) {
    console.log('Returning cached response');
    return res.json(cachedResponse); // Return cached response if available
  }

  console.log(url);

  try {
    const startTime = Date.now();  // Capture the start time
    const response = await axios.get(url);
    const endTime = Date.now();   // Capture the end time
    const timeTaken = endTime - startTime; // Calculate time taken in milliseconds

    console.log(`Time taken: ${timeTaken} ms`); // Print the time taken
    console.log(response.data); // Log the response data

    
    // Reshape the response
    const { distances, durations } = response.data;

    // Create formattedResponse based on annotations
    const formattedResponse = {
      solution: {
        info: {
          copyrights: ["Fareye", "OpenStreetMap contributors"],
        },
      },
      status: "finished",
    };

    // Conditionally add properties based on annotations
    if (annotations.includes('distances')) {
      formattedResponse.solution.distances = distances; // Include distances if present in annotations
    }
    if (annotations.includes('times')) {
      formattedResponse.solution.times = durations; // Include times if present in annotations
    }


    // Cache the response
    cache.set(url, formattedResponse);

    res.json(formattedResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching data from OSRM', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
