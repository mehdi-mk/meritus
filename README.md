# meritus
A true merit based platform for job seekers and companies.

### Notes:
1. The email service is currently built on top of local smtpd service. To run it have a separate Terminal running the following:<br>
```
python -m smtpd -n -c DebuggingServer localhost:8025
```

2. The app is configured to use PostgreSQL. Here's how to set it up:
- Create a `.env` file in the root directory of the project.
- Add the following line to the `.env` file, updating the connection string if your database details are different:
  ```
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
  ```
- Install the PostgreSQL driver for Python:
  ```
  pip install psycopg2-binary
  ```

