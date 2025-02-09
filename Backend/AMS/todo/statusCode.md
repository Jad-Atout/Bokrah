# API Status Codes Documentation

## 1. User Registration (POST /customers/register)

- **201 Created**: Successfully created a new user.
  - Example: User successfully registered with all required fields.
- **400 Bad Request**: Client sent invalid data, such as missing or invalid required fields.
  - Example: Missing userName, email, password, or phoneNumber.
- **409 Conflict**: A conflict occurred, such as when the user already exists (e.g., duplicate email or username).
  - Example: Attempt to register an email that already exists in the system.
- **500 Internal Server Error**: A server-side issue occurred, such as a database error.
  - Example: An unexpected error or failure in database interaction.

## 2. User Login (POST /customers/login)

- **200 OK**: Successfully logged in, typically returning a token or user data.
  - Example: User successfully logged in with correct credentials.
- **400 Bad Request**: Missing login fields (email or password).
  - Example: email or password is missing from the request body.
- **401 Unauthorized**: Invalid login credentials (e.g., wrong email or password).
  - Example: Incorrect password or email during login attempt.
- **500 Internal Server Error**: A server-side error, such as a database issue or failed login process.

## 3. Get User Data (GET /customers/{id})

- **200 OK**: Successfully retrieved the user data.
  - Example: User data found and returned.
- **404 Not Found**: User does not exist.
  - Example: Attempt to access a user that doesn't exist in the database.
- **500 Internal Server Error**: Server error while retrieving user data.

## 4. Update User Data (PUT /customers/{id})

- **200 OK**: Successfully updated the user's data.
  - Example: The user’s information was successfully updated.
- **400 Bad Request**: Invalid or incomplete data in the request body.
  - Example: Missing fields required for the update.
- **404 Not Found**: The user doesn't exist to update.
  - Example: Trying to update a non-existent user.
- **500 Internal Server Error**: Server-side error during the update process.

## 5. Delete User (DELETE /customers/{id})

- **200 OK**: Successfully deleted the user.
  - Example: User was successfully deleted from the system.
- **404 Not Found**: User to be deleted doesn't exist.
  - Example: Trying to delete a user that doesn't exist.
- **500 Internal Server Error**: Server-side error during the deletion process.

## 6. Validation Errors

- **400 Bad Request**: Typically used for validation errors where required fields are missing or invalid.
  - Examples:
    - Missing username, email, password, phoneNumber.
    - Invalid email format.
    - Invalid phoneNumber format.
- **422 Unprocessable Entity**: When the server understands the content type, but it’s unable to process the contained instructions (useful for validation failures).
  - Example: Invalid password that doesn’t meet required criteria (e.g., length, special characters).

## General Guidelines for Status Codes:

### 2xx: Successful responses
- **200 OK**: Generic success for GET, PUT, DELETE operations.
- **201 Created**: Success for POST requests when something is created (e.g., user registration).

### 4xx: Client-side errors
- **400 Bad Request**: Generic client-side error for bad input.
- **401 Unauthorized**: Authentication failure (e.g., wrong credentials).
- **403 Forbidden**: Client is authenticated but not authorized to perform the action.
- **404 Not Found**: The requested resource doesn’t exist (e.g., user not found).

### 5xx: Server-side errors
- **500 Internal Server Error**: Generic server-side error (e.g., database issues, unhandled exceptions).
- **502 Bad Gateway**, **503 Service Unavailable**, **504 Gateway Timeout**: Server or network-related issues, typically not used for standard application errors.

