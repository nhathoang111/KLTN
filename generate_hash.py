import bcrypt

password = "123456"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=10))
print(hashed.decode('utf-8'))

