import request from 'supertest';
import { app } from '../../index.js';  // Use named import since app is exported using 'export'
import {customerCreateData}from './customerTestData.js';
import {sequelize} from "../../DB/connection.js"; // Ensure this path is correct

describe("POST /customers/register", () => {
    customerCreateData.forEach(({ input, expectedStatus, expectedMessage }) => {
        it(`should return status ${expectedStatus} and message '${expectedMessage}' for input: ${JSON.stringify(input)}`, async () => {
            const response = await request(app)
                .post('/customers/register')
                .send(input);

            expect(response.status).toBe(expectedStatus);
            expect(response.body.message).toBe(expectedMessage);
        });
    });
});
afterAll(async () => {
    await sequelize.close();
})
