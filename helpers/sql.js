const { BadRequestError } = require("../expressError");

// THIS NEEDS SOME GREAT DOCUMENTATION.

/*
Helps partially update a query.
The dataToUpdate param is used to insert: field you want to update: value you want to use 

The jsToSql param does just what it says: it takes js-style data and makes it useable for sql.
It will send js-style data like "firstName" and match it to sql column "firt_name"

Example: {firstName: "Kevin", lastName: Johnson} = { setCols: '"first_name"=$1, "last_name"=$2' },
            { values: ["Kevin", "Johnson"]}
*/

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
