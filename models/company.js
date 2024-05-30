"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies with an optional filter.
   * This allows you to take a filter and use it to return the right query
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(searchFilters = {}) {
    let query = 
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies`;
    
    let whereQuery = [];
    let queryValues = []; 
    const { minEmployees, maxEmployees, name } = searchFilters; //these are the filters we are using
// if the minimum employees are greater than the max, throw an error because it wouldn't make sense
    if (minEmployees > maxEmployees) {
      throw new BadRequestError("Minimum employees cannot be greater than the max amount chosen")
    }
// if there is a minEmployees filter entered, add the value to the queryValues array
// then add to the whereQuery the condition made by the queryValue:
// WHERE statement: number of employees must be greater than or equal to the length of the queryValue (min)
    if (minEmployees !== undefined) {
      queryValues.push(minEmployees);
      whereQuery.push(`num_employees >= $${queryValues.length}`)
    }
// same thing as the minEmployees but with maxEmployees
// the number of employees must be less than or equal to the queryValue (max)
    if (maxEmployees !== undefined) {
      queryValues.push(maxEmployees);
      whereQuery.push(`num_employees <= $${queryValues.length}`)
    }
// if there is a name filter, put it with your queryValues (use %% to find the exact match for the name)
// add the name of the queryValues to the whereQuery array (ILIKE is used so capitalization does not matter)
    if (name) {
      queryValues.push(`%${name}%`);
      whereQuery.push(`name ILIKE $${queryValues}`)
    }
// if there is a whereQuery (a filter), add the WHERE clause and the whereQuery (filter) to the existing query
// .join(" AND ") allows for multiple queries at once (ex. WHERE minEmployees = 1 AND maxEmployees = 7)
    if (whereQuery.length > 0) {
      query += " WHERE " + whereQuery.join(" AND ")
    }
// take the whole query that was formed and order it by name
    query += " ORDER BY name";
// put the whole query in one variable and return it    
    const companiesRes = await db.query(query, queryValues);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
    const jobsRes = await db.query(
            `SELECT id, title, salary, equity
            FROM jobs
            WHERE company_handle = $1`, [handle],
    );
    company.jobs = jobsRes.rows;

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
