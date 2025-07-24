from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'a_default_secret_key_for_development_only')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Email Configuration
app.config['MAIL_SERVER'] = 'localhost'
app.config['MAIL_PORT'] = 8025
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'your-dev-email@example.com'
app.config['MAIL_PASSWORD'] = None
app.config['MAIL_DEFAULT_SENDER'] = 'your-dev-email@example.com'

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
mail = Mail(app)
s = URLSafeTimedSerializer(app.config['SECRET_KEY'])

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(200))
    confirmed = db.Column(db.Boolean, nullable=False, default=False)
    experiences = db.relationship('Experience', backref='user', lazy=True, cascade="all, delete-orphan")
    certificates = db.relationship('Certificate', backref='user', lazy=True, cascade="all, delete-orphan")
    degrees = db.relationship('Degree', backref='user', lazy=True, cascade="all, delete-orphan")

class Experience(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    position_title = db.Column(db.String(150), nullable=False)
    employer = db.Column(db.String(150), nullable=False)
    country = db.Column(db.String(100))
    city = db.Column(db.String(100))
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    is_present = db.Column(db.Boolean, default=False)
    employment_type = db.Column(db.String(50))
    employment_arrangement = db.Column(db.String(50))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self, for_editing=False):
        data = {
            'id': self.id,
            'position_title': self.position_title,
            'employer': self.employer,
            'country': self.country,
            'city': self.city,
            'is_present': self.is_present,
            'employment_type': self.employment_type,
            'employment_arrangement': self.employment_arrangement
        }
        if for_editing:
            data['start_date'] = self.start_date.strftime('%Y-%m')
            data['end_date'] = self.end_date.strftime('%Y-%m') if self.end_date else None
        else:
            data['start_date'] = self.start_date.strftime('%B %Y')
            data['end_date'] = self.end_date.strftime('%B %Y') if self.end_date else None
        return data

class Certificate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    issuer = db.Column(db.String(150), nullable=False)
    issue_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date, nullable=True)
    credential_id = db.Column(db.String(100))
    credential_url = db.Column(db.String(255))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self, for_editing=False):
        data = {
            'id': self.id,
            'title': self.title,
            'issuer': self.issuer,
            'credential_id': self.credential_id,
            'credential_url': self.credential_url
        }
        if for_editing:
            data['issue_date'] = self.issue_date.strftime('%Y-%m')
            data['expiry_date'] = self.expiry_date.strftime('%Y-%m') if self.expiry_date else None
        else:
            data['issue_date'] = self.issue_date.strftime('%B %Y')
            data['expiry_date'] = self.expiry_date.strftime('%B %Y') if self.expiry_date else None
        return data

class Degree(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    degree = db.Column(db.String(150), nullable=False)
    field_of_study = db.Column(db.String(150), nullable=False)
    school = db.Column(db.String(150), nullable=False)
    country = db.Column(db.String(100))
    city = db.Column(db.String(100))
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    gpa = db.Column(db.String(10))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self, for_editing=False):
        data = {
            'id': self.id,
            'degree': self.degree,
            'field_of_study': self.field_of_study,
            'school': self.school,
            'country': self.country,
            'city': self.city,
            'gpa': self.gpa
        }
        if for_editing:
            data['start_date'] = self.start_date.strftime('%Y-%m')
            data['end_date'] = self.end_date.strftime('%Y-%m')
        else:
            data['start_date'] = self.start_date.strftime('%B %Y')
            data['end_date'] = self.end_date.strftime('%B %Y')
        return data

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def parse_date(date_str):
    return datetime.strptime(date_str, '%Y-%m').date() if date_str else None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        email, password = request.form.get('email'), request.form.get('password')
        if User.query.filter_by(email=email).first():
            flash('Email address already exists')
            return redirect(url_for('signup'))
        new_user = User(email=email, password=generate_password_hash(password, method='pbkdf2:sha256'), confirmed=False)
        try:
            db.session.add(new_user)
            db.session.flush()
            token = s.dumps(email, salt='email-confirm')
            msg = Message('Confirm Email', recipients=[email], body=f'Your email confirmation link is {url_for("confirm_email", token=token, _external=True)}')
            mail.send(msg)
            db.session.commit()
            flash('A confirmation email has been sent. Please check your inbox.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash('There was a problem sending the confirmation email. Please try again.', 'danger')
            return redirect(url_for('signup'))
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email, password = request.form.get('email'), request.form.get('password')
        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('dashboard'))
        flash('Please check your login details and try again.')
    return render_template('login.html')

@app.route('/confirm_email/<token>')
def confirm_email(token):
    try:
        email = s.loads(token, salt='email-confirm', max_age=3600)
    except SignatureExpired:
        return '<h1>The confirmation link is expired or invalid!</h1>'
    user = User.query.filter_by(email=email).first_or_404()
    user.confirmed = True
    db.session.commit()
    flash('Email confirmed successfully! You can now login.', 'success')
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# --- Generic API Functions ---
def get_item(model, item_id):
    item = model.query.get_or_404(item_id)
    if item.user_id != current_user.id: return jsonify({'error': 'Forbidden'}), 403
    return jsonify(item.to_dict(for_editing=True))

def delete_item(model, item_id):
    item = model.query.get_or_404(item_id)
    if item.user_id != current_user.id: return jsonify({'error': 'Forbidden'}), 403
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Item deleted successfully'}), 200

# --- Experience API ---
@app.route('/api/experiences', methods=['GET'])
@login_required
def get_experiences():
    exps = Experience.query.filter_by(user_id=current_user.id).order_by(Experience.is_present.desc(), Experience.end_date.desc(), Experience.start_date.desc()).all()
    return jsonify([exp.to_dict() for exp in exps])

@app.route('/api/experiences/<int:id>', methods=['GET'])
@login_required
def get_experience(id): return get_item(Experience, id)

@app.route('/api/experiences', methods=['POST'])
@login_required
def add_experience():
    data = request.get_json()
    new_exp = Experience(user_id=current_user.id, **{k: (parse_date(v) if 'date' in k else v) for k, v in data.items() if k in Experience.__table__.columns})
    db.session.add(new_exp)
    db.session.commit()
    return jsonify(new_exp.to_dict()), 201

@app.route('/api/experiences/<int:id>', methods=['PUT'])
@login_required
def update_experience(id):
    exp = Experience.query.get_or_404(id)
    if exp.user_id != current_user.id: return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json()
    for key, value in data.items():
        if hasattr(exp, key): setattr(exp, key, parse_date(value) if 'date' in key else value)
    db.session.commit()
    return jsonify(exp.to_dict()), 200

@app.route('/api/experiences/<int:id>', methods=['DELETE'])
@login_required
def delete_experience(id): return delete_item(Experience, id)

# --- Certificate API ---
@app.route('/api/certificates', methods=['GET'])
@login_required
def get_certificates():
    certs = Certificate.query.filter_by(user_id=current_user.id).order_by(Certificate.issue_date.desc()).all()
    return jsonify([cert.to_dict() for cert in certs])

@app.route('/api/certificates/<int:id>', methods=['GET'])
@login_required
def get_certificate(id): return get_item(Certificate, id)

@app.route('/api/certificates', methods=['POST'])
@login_required
def add_certificate():
    data = request.get_json()
    new_cert = Certificate(user_id=current_user.id, **{k: (parse_date(v) if 'date' in k else v) for k, v in data.items() if k in Certificate.__table__.columns})
    db.session.add(new_cert)
    db.session.commit()
    return jsonify(new_cert.to_dict()), 201

@app.route('/api/certificates/<int:id>', methods=['PUT'])
@login_required
def update_certificate(id):
    cert = Certificate.query.get_or_404(id)
    if cert.user_id != current_user.id: return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json()
    for key, value in data.items():
        if hasattr(cert, key): setattr(cert, key, parse_date(value) if 'date' in key else value)
    db.session.commit()
    return jsonify(cert.to_dict()), 200

@app.route('/api/certificates/<int:id>', methods=['DELETE'])
@login_required
def delete_certificate(id): return delete_item(Certificate, id)

# --- Degree API ---
@app.route('/api/degrees', methods=['GET'])
@login_required
def get_degrees():
    degs = Degree.query.filter_by(user_id=current_user.id).order_by(Degree.end_date.desc()).all()
    return jsonify([deg.to_dict() for deg in degs])

@app.route('/api/degrees/<int:id>', methods=['GET'])
@login_required
def get_degree(id): return get_item(Degree, id)

@app.route('/api/degrees', methods=['POST'])
@login_required
def add_degree():
    data = request.get_json()
    new_deg = Degree(user_id=current_user.id, **{k: (parse_date(v) if 'date' in k else v) for k, v in data.items() if k in Degree.__table__.columns})
    db.session.add(new_deg)
    db.session.commit()
    return jsonify(new_deg.to_dict()), 201

@app.route('/api/degrees/<int:id>', methods=['PUT'])
@login_required
def update_degree(id):
    deg = Degree.query.get_or_404(id)
    if deg.user_id != current_user.id: return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json()
    for key, value in data.items():
        if hasattr(deg, key): setattr(deg, key, parse_date(value) if 'date' in key else value)
    db.session.commit()
    return jsonify(deg.to_dict()), 200

@app.route('/api/degrees/<int:id>', methods=['DELETE'])
@login_required
def delete_degree(id): return delete_item(Degree, id)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)