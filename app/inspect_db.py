from main import app, db
from sqlalchemy import inspect

with app.app_context():
    inspector = inspect(db.engine)
    
    print("--- Table: questions ---")
    columns = inspector.get_columns('questions')
    for col in columns:
        print(f"Column: {col['name']} - {col['type']}")
        
    print("\n--- Table: answers ---")
    fks = inspector.get_foreign_keys('answers')
    for fk in fks:
        print(f"FK: {fk}")
