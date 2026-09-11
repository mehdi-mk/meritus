"""Redesign interview questionnaire schema

Revision ID: a1b2c3d4e5f6
Revises: 88a5f21566c5
Create Date: 2026-09-03 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '88a5f21566c5'
branch_labels = None
depends_on = None


def _has_table(inspector, name):
    return name in inspector.get_table_names()


def _has_column(inspector, table, column):
    if not _has_table(inspector, table):
        return False
    return any(c['name'] == column for c in inspector.get_columns(table))


def _has_unique(inspector, table, name):
    if not _has_table(inspector, table):
        return False
    return any(u.get('name') == name for u in inspector.get_unique_constraints(table))


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    # --- tests ---
    if not _has_table(inspector, 'tests'):
        op.create_table(
            'tests',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
            sa.Column('test_type', sa.String(length=1), nullable=False),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )
        inspector = inspect(bind)

    if _has_column(inspector, 'tests', 'question_count'):
        with op.batch_alter_table('tests') as batch_op:
            batch_op.drop_column('question_count')

    # --- questions ---
    if not _has_table(inspector, 'questions'):
        op.create_table(
            'questions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('test_id', sa.Integer(), sa.ForeignKey('tests.id'), nullable=False),
            sa.Column('question_type', sa.String(length=1), nullable=False),
            sa.Column('question_text', sa.Text(), nullable=False),
            sa.Column('expected_answer', sa.Text(), nullable=True),
            sa.Column('char_limit', sa.Integer(), nullable=True),
            sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        )
        inspector = inspect(bind)
    else:
        if _has_column(inspector, 'questions', 'answer') and not _has_column(inspector, 'questions', 'expected_answer'):
            with op.batch_alter_table('questions') as batch_op:
                batch_op.alter_column('answer', new_column_name='expected_answer')
            inspector = inspect(bind)
        elif not _has_column(inspector, 'questions', 'expected_answer'):
            with op.batch_alter_table('questions') as batch_op:
                batch_op.add_column(sa.Column('expected_answer', sa.Text(), nullable=True))
            inspector = inspect(bind)

        if not _has_column(inspector, 'questions', 'position'):
            with op.batch_alter_table('questions') as batch_op:
                batch_op.add_column(sa.Column('position', sa.Integer(), nullable=False, server_default='0'))
            inspector = inspect(bind)

    # --- question_options ---
    if not _has_table(inspector, 'question_options'):
        op.create_table(
            'question_options',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('question_id', sa.Integer(), sa.ForeignKey('questions.id'), nullable=False),
            sa.Column('option_text', sa.Text(), nullable=False),
            sa.Column('is_correct', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        )
        inspector = inspect(bind)

    # Copy legacy answers -> question_options if needed
    if _has_table(inspector, 'answers'):
        bind.execute(sa.text("""
            INSERT INTO question_options (question_id, option_text, is_correct, position)
            SELECT a.question_id, a.answer_text, COALESCE(a.is_correct, false),
                   ROW_NUMBER() OVER (PARTITION BY a.question_id ORDER BY a.id) - 1
            FROM answers a
            WHERE NOT EXISTS (
                SELECT 1 FROM question_options qo
                WHERE qo.question_id = a.question_id AND qo.option_text = a.answer_text
            )
        """))
        op.drop_table('answers')
        inspector = inspect(bind)

    # --- test_submissions ---
    if not _has_table(inspector, 'test_submissions'):
        op.create_table(
            'test_submissions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('test_id', sa.Integer(), sa.ForeignKey('tests.id'), nullable=False),
            sa.Column('job_id', sa.Integer(), sa.ForeignKey('job_posting.id'), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
            sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint('test_id', 'job_id', 'user_id', name='uq_submission_test_job_user'),
        )
        inspector = inspect(bind)
    elif not _has_unique(inspector, 'test_submissions', 'uq_submission_test_job_user'):
        with op.batch_alter_table('test_submissions') as batch_op:
            batch_op.create_unique_constraint(
                'uq_submission_test_job_user', ['test_id', 'job_id', 'user_id']
            )
        inspector = inspect(bind)

    # --- submission_answers ---
    if not _has_table(inspector, 'submission_answers'):
        op.create_table(
            'submission_answers',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('submission_id', sa.Integer(), sa.ForeignKey('test_submissions.id'), nullable=False),
            sa.Column('question_id', sa.Integer(), sa.ForeignKey('questions.id'), nullable=False),
            sa.Column('selected_option_id', sa.Integer(), sa.ForeignKey('question_options.id'), nullable=True),
            sa.Column('text_response', sa.Text(), nullable=True),
        )
        inspector = inspect(bind)

    # --- job_posting.test_id ---
    if not _has_column(inspector, 'job_posting', 'test_id'):
        with op.batch_alter_table('job_posting') as batch_op:
            batch_op.add_column(sa.Column('test_id', sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                'fk_job_posting_test_id', 'tests', ['test_id'], ['id'], ondelete='SET NULL'
            )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    if _has_column(inspector, 'job_posting', 'test_id'):
        with op.batch_alter_table('job_posting') as batch_op:
            batch_op.drop_constraint('fk_job_posting_test_id', type_='foreignkey')
            batch_op.drop_column('test_id')

    if _has_table(inspector, 'submission_answers'):
        op.drop_table('submission_answers')

    if _has_table(inspector, 'test_submissions'):
        op.drop_table('test_submissions')

    if _has_table(inspector, 'question_options') and not _has_table(inspector, 'answers'):
        op.create_table(
            'answers',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('question_id', sa.Integer(), sa.ForeignKey('questions.id'), nullable=False),
            sa.Column('answer_text', sa.Text(), nullable=False),
            sa.Column('is_correct', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        )
        bind.execute(sa.text("""
            INSERT INTO answers (question_id, answer_text, is_correct)
            SELECT question_id, option_text, is_correct FROM question_options
        """))
        op.drop_table('question_options')

    inspector = inspect(bind)
    if _has_column(inspector, 'questions', 'expected_answer') and not _has_column(inspector, 'questions', 'answer'):
        with op.batch_alter_table('questions') as batch_op:
            batch_op.alter_column('expected_answer', new_column_name='answer')

    if _has_column(inspector, 'questions', 'position'):
        with op.batch_alter_table('questions') as batch_op:
            batch_op.drop_column('position')

    if _has_table(inspector, 'tests') and not _has_column(inspector, 'tests', 'question_count'):
        with op.batch_alter_table('tests') as batch_op:
            batch_op.add_column(sa.Column('question_count', sa.Integer(), nullable=True))
