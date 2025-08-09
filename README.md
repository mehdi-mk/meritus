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

### Schema Updates on Tables:
I have installed and used Flask-Migrate for easy schema updates whenever making a change
to a table schema, without having to manually drop/create tables and add dummy data.

For subsequent updates do:

1. Generate migration:
```
flask db migrate -m "Description of changes"
```
If getting an error on the .py file, then run this instead:
```
python -m flask --app app/main.py db migrate -m "Description of changes"
```
Just make sure about the name and path of the .py file.

2. Apply migration:
```
flask db upgrade
```
Again, if getting an error, then:
```
python -m flask --app app/main.py db upgrade
```