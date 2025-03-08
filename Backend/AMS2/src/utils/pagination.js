export const pagination = (page, limit) => {
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 5;

    const skip = (page - 1) * limit;

    return { skip, limit };
};
