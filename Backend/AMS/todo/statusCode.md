# API Documentation

## Table of Contents
1. [Adding Status Code File](#1-Status-Codes-Reference)
2. [ Database Controller](#2-Database-Controller)
3. [ Organize Google Calendar ](#3-Organizing-Google-Calendar-Integration)
---

## 1. Status Codes Reference

### **2xx: Success**
- **200 OK**
  - Successfully logged in
  - Successfully updated
  - Successful data retrieval
  - Successful data deletion
- **201 Created**
  - Resource successfully created

### **4xx: Client Errors**
- **400 Bad Request**
  - Invalid login credentials (e.g., wrong email or password)
  - Invalid or incomplete data in the request body
  - Generic client-side error for bad input
- **401 Unauthorized**
  - Authentication failure (e.g., wrong credentials)
- **403 Forbidden**
  - Authenticated but not authorized to perform the action
- **404 Not Found**
  - The requested resource doesn’t exist
- **422 Unprocessable Entity**
  - Invalid password that doesn’t meet required criteria (e.g., length, special characters)

### **5xx: Server Errors**
- **500 Internal Server Error**
  - Generic server-side error (e.g., database issues, unhandled exceptions)
- **502 Bad Gateway**
  - Server or network-related issues, typically not used for standard application errors
- **504 Gateway Timeout**
  - Server or network-related issues, typically not used for standard application errors


  

## 2. Database Controller
- **Objective**: Create a centralized database controller to manage all queries in a single place.
- **Benefits**:
  - Cleaner and more maintainable code.
  - Consistent query handling across the project.
  - Improved debugging and testing capabilities.

- Use a service layer for all database interactions.
- Leverage an ORM like **Sequelize** (already part of your project) to abstract raw SQL queries.
- Structure the codebase, ensuring modularity:
    ```plaintext
    /src
      /controllers
        databaseController.js
      /models
        User.js
        Product.js
      /services
        userService.js
      /utils
        errors.js
    ```

## 3. Organizing Google Calendar Integration
- **Objective**: Refactor and modularize the Google Calendar integration for improved maintainability.
- **Key Tasks**:
  - Modularize API calls to Google Calendar.
    - Create utility functions for operations like creating events, fetching calendar data, or deleting events.
  - Centralize configuration (e.g., authentication or API credentials) using **dotenv**.
  - Separate concerns by creating a dedicated class or service for calendar-related actions.

- File structure :
  ```plaintext
  /src
    /services
      googleCalendarService.js
    /config
      googleAuth.js
  ```

---