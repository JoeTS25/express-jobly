const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", () => {
    test("partial update", () => {
        const result = sqlForPartialUpdate(
            { firstName: "Kevin", lastName: "Johnson" },
            { firstName: "first_name", lastName: "last_name"}
        );
        expect(result).toEqual(
            { setCols: '"first_name"=$1, "last_name"=$2' },
            { values: ["Kevin", "Johnson"]});
    });
});