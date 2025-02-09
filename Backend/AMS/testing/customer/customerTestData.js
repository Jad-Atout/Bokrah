export const customerCreateData = [
    // Valid cases
    { input: { userName: "JohnDoe", email: "johndoe@example.com", password: "Password123!", phoneNumber: "1234567890" }, expectedStatus: 201, expectedMessage: "User created" },
    { input: { userName: "JaneSmith", email: "janesmith@example.com", password: "Password456!", phoneNumber: "0987654321" }, expectedStatus: 201, expectedMessage: "User created" },
    { input: { userName: "AliceJohnson", email: "alice.johnson@example.com", password: "Alice@1234", phoneNumber: "1122334455" }, expectedStatus: 201, expectedMessage: "User created" },
    { input: { userName: "BobBrown", email: "bobbrown@example.com", password: "BobBrown#2023", phoneNumber: "2233445566" }, expectedStatus: 201, expectedMessage: "User created" },
    { input: { userName: "CharlieDavis", email: "charlie.davis@example.com", password: "Charlie@7890", phoneNumber: "3344556677" }, expectedStatus: 201, expectedMessage: "User created" },
    { input: { userName: "DavidMartinez", email: "david.martinez@example.com", password: "David@1234", phoneNumber: "4455667788" }, expectedStatus: 201, expectedMessage: "User created" },
    { input: { userName: "EmmaWhite", email: "emma.white@example.com", password: "EmmaWhite@2023", phoneNumber: "5566778899" }, expectedStatus: 201, expectedMessage: "User created" },
    { input: { userName: "FrankHarris", email: "frank.harris@example.com", password: "Frank#Harris123", phoneNumber: "6677889900" }, expectedStatus: 201, expectedMessage: "User created" },
    { input: { userName: "GraceTaylor", email: "grace.taylor@example.com", password: "Grace1234@!", phoneNumber: "7788990011" }, expectedStatus: 201, expectedMessage: "User created" },
    { input: { userName: "HenryKing", email: "henry.king@example.com", password: "HenryKing!2023", phoneNumber: "8899001122" }, expectedStatus: 201, expectedMessage: "User created" },

    // Invalid cases
    { input: { userName: "", email: "johndoe@example.com", password: "Password123!", phoneNumber: "1234567890" }, expectedStatus: 400, expectedMessage: "Username is required" },
    { input: { userName: "InvalidUser", email: "", password: "Password123!", phoneNumber: "1234567890" }, expectedStatus: 400, expectedMessage: "Email is required" },
    { input: { userName: "JohnDoe", email: "johndoe@example.com", password: "", phoneNumber: "1234567890" }, expectedStatus: 400, expectedMessage: "Password is required" },
    { input: { userName: "JohnDoe", email: "johndoe@example.com", password: "Password123!", phoneNumber: "" }, expectedStatus: 400, expectedMessage: "Phone number is required" },

    // Edge cases
    { input: { userName: "MaxLengthUserNameThatExceedsLimit", email: "max@domain.com", password: "Password123!", phoneNumber: "1234567890" }, expectedStatus: 400, expectedMessage: "Username too long" },
    { input: { userName: "Short", email: "short@domain.com", password: "P@ssword", phoneNumber: "1234567890" }, expectedStatus: 400, expectedMessage: "Phone number invalid" },
];

