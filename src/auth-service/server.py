import jwt, datetime, os
import psycopg2
from flask import Flask, request

server = Flask(__name__)

def get_db_connection():
    conn = psycopg2.connect(host=os.getenv('DATABASE_HOST'),
                            database=os.getenv('DATABASE_NAME'),
                            user=os.getenv('DATABASE_USER'),
                            password=os.getenv('DATABASE_PASSWORD'),
                            port=5432)
    return conn


@server.route('/login', methods=['POST'])
def login():
    auth_table_name = os.getenv('AUTH_TABLE')
    auth = request.authorization
    if not auth or not auth.username or not auth.password:
        return 'Could not verify', 401, {'WWW-Authenticate': 'Basic realm="Login required!"'}

    conn = get_db_connection()
    cur = conn.cursor()
    query = f"SELECT email, password FROM {auth_table_name} WHERE email = %s"
    cur.execute(query, (auth.username,))
    user_row = cur.fetchone()
    
    if user_row:
        email, password = user_row
        if auth.password == password:
            return CreateJWT(auth.username, os.environ['JWT_SECRET'], True)
        else:
            return 'Could not verify', 401, {'WWW-Authenticate': 'Basic realm="Login required!"'}
    else:
        return 'Could not verify', 401, {'WWW-Authenticate': 'Basic realm="Login required!"'}

@server.route('/register', methods=['POST'])
def register():
    auth_table_name = os.getenv('AUTH_TABLE')
    auth = request.authorization
    if not auth or not auth.username or not auth.password:
        return 'Missing credentials', 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Check if user already exists
        cur.execute(f"SELECT 1 FROM {auth_table_name} WHERE email = %s", (auth.username,))
        if cur.fetchone():
            return 'User already exists', 409

        # Create new user
        cur.execute(
            f"INSERT INTO {auth_table_name} (email, password) VALUES (%s, %s)",
            (auth.username, auth.password),
        )
        conn.commit()
        return 'User created', 201
    except Exception as err:
        print(err)
        return 'Internal server error', 500

def CreateJWT(username, secret, authz):
    return jwt.encode(
        {
            "username": username,
            "exp": datetime.datetime.now(tz=datetime.timezone.utc) + datetime.timedelta(days=1),
            "iat": datetime.datetime.now(tz=datetime.timezone.utc),
            "admin": authz,
        },
        secret,
        algorithm="HS256",
    )

@server.route('/validate', methods=['POST'])
def validate():
    encoded_jwt = request.headers['Authorization']
    
    if not encoded_jwt:
        return 'Unauthorized', 401, {'WWW-Authenticate': 'Basic realm="Login required!"'}

    encoded_jwt = encoded_jwt.split(' ')[1]
    try:
        decoded_jwt = jwt.decode(encoded_jwt, os.environ['JWT_SECRET'], algorithms=["HS256"])
    except:
        return 'Unauthorized', 401, {'WWW-Authenticate': 'Basic realm="Login required!"'}
    
    return decoded_jwt, 200

if __name__ == '__main__':
    server.run(host='0.0.0.0', port=5000)
