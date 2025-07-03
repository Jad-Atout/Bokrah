import fs from 'fs';

const availableSlots = [
    {
        "startTime": "2025-06-25T05:00:00.000Z",
        "endTime": "2025-06-25T06:00:00.000Z",
        "subSlots": [
            {
                "startTime": "2025-06-25T05:00:00.000Z",
                "endTime": "2025-06-25T06:00:00.000Z",
                "staffServices": [
                    {
                        "staffId": "6859a2b2c20a2d1f393aec65",
                        "services": [
                            "6858725a37aca332fe8acf75"
                        ]
                    }
                ]
            }
        ]
    },
    {
        "startTime": "2025-06-25T06:00:00.000Z",
        "endTime": "2025-06-25T07:00:00.000Z",
        "subSlots": [
            {
                "startTime": "2025-06-25T06:00:00.000Z",
                "endTime": "2025-06-25T07:00:00.000Z",
                "staffServices": [
                    {
                        "staffId": "6859a2b2c20a2d1f393aec65",
                        "services": [
                            "6858725a37aca332fe8acf75"
                        ]
                    }
                ]
            }
        ]
    },
    {
        "startTime": "2025-06-25T07:00:00.000Z",
        "endTime": "2025-06-25T08:00:00.000Z",
        "subSlots": [
            {
                "startTime": "2025-06-25T07:00:00.000Z",
                "endTime": "2025-06-25T08:00:00.000Z",
                "staffServices": [
                    {
                        "staffId": "6859a2b2c20a2d1f393aec65",
                        "services": [
                            "6858725a37aca332fe8acf75"
                        ]
                    }
                ]
            }
        ]
    },
    {
        "startTime": "2025-06-25T08:00:00.000Z",
        "endTime": "2025-06-25T09:00:00.000Z",
        "subSlots": [
            {
                "startTime": "2025-06-25T08:00:00.000Z",
                "endTime": "2025-06-25T09:00:00.000Z",
                "staffServices": [
                    {
                        "staffId": "6859a2b2c20a2d1f393aec65",
                        "services": [
                            "6858725a37aca332fe8acf75"
                        ]
                    }
                ]
            }
        ]
    },
    {
        "startTime": "2025-06-25T09:00:00.000Z",
        "endTime": "2025-06-25T10:00:00.000Z",
        "subSlots": [
            {
                "startTime": "2025-06-25T09:00:00.000Z",
                "endTime": "2025-06-25T10:00:00.000Z",
                "staffServices": [
                    {
                        "staffId": "6859a2b2c20a2d1f393aec65",
                        "services": [
                            "6858725a37aca332fe8acf75"
                        ]
                    }
                ]
            }
        ]
    },
    {
        "startTime": "2025-06-25T10:00:00.000Z",
        "endTime": "2025-06-25T11:00:00.000Z",
        "subSlots": [
            {
                "startTime": "2025-06-25T10:00:00.000Z",
                "endTime": "2025-06-25T11:00:00.000Z",
                "staffServices": [
                    {
                        "staffId": "6859a2b2c20a2d1f393aec65",
                        "services": [
                            "6858725a37aca332fe8acf75"
                        ]
                    }
                ]
            }
        ]
    },
    {
        "startTime": "2025-06-25T11:00:00.000Z",
        "endTime": "2025-06-25T12:00:00.000Z",
        "subSlots": [
            {
                "startTime": "2025-06-25T11:00:00.000Z",
                "endTime": "2025-06-25T12:00:00.000Z",
                "staffServices": [
                    {
                        "staffId": "6859a2b2c20a2d1f393aec65",
                        "services": [
                            "6858725a37aca332fe8acf75"
                        ]
                    }
                ]
            }
        ]
    },
    {
        "startTime": "2025-06-25T12:00:00.000Z",
        "endTime": "2025-06-25T13:00:00.000Z",
        "subSlots": [
            {
                "startTime": "2025-06-25T12:00:00.000Z",
                "endTime": "2025-06-25T13:00:00.000Z",
                "staffServices": [
                    {
                        "staffId": "6859a2b2c20a2d1f393aec65",
                        "services": [
                            "6858725a37aca332fe8acf75"
                        ]
                    }
                ]
            }
        ]
    }
]

const customerId = "67ccc02e9e410fda8a3ada2d";
const count = 50; // How many test requests you want

const appointments = Array.from({ length: count }, () => {
    const slot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
    return {
        customerId,
        slot
    };
});

fs.writeFileSync("appointments.json", JSON.stringify(appointments, null, 2));