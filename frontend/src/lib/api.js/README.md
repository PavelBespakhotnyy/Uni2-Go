This file contains helper functions for making HTTP requests from the frontend to the backend API.  
Use this file to centralize all API-related logic, such as:

- Base URL configuration
- Fetch wrappers
- GET, POST, PUT, DELETE request helpers
- Error handling
- Authorization headers (if needed)
- Reusable request utilities for the entire Svelte application

All components and pages should import API functions from here instead of calling `fetch()` directly.
