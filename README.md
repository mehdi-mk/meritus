# meritus
A true merit based platform for job seekers and companies.

### Notes:
1. The email service is currently built on top of local smtpd service. To run it have a separate Terminal running the following:<br>
```
python -m smtpd -n -c DebuggingServer localhost:8025
```

2. The app is currently configured to use a local PostgreSQL. Here's how to configure it:
- Set up environment variable for the database address:
    - On macOS or Linux:
```
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```
    - On Windows (Command Prompt):
```
set DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```
- Install the PostgreSQL driver for Python:
```
pip install psycopg2-binary
```
