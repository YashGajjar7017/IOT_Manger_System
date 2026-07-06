with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# We want to replace 'return (\n\n      {!isLoggedIn && (' with 'return (\n    <>\n      {!isLoggedIn && ('
# And remove the first '<>' after the closing tag of the login div
# Let's locate:
#   return (
# 
#       {!isLoggedIn && (

old_block = """  return (

      {!isLoggedIn && ("""

# The login div ends with:
#       )}
#     <>

old_end = """      )}
    <>"""

# Let's verify if they exist in the code
if old_block in code and old_end in code:
    code = code.replace(old_block, "  return (\n    <>\n      {!isLoggedIn && (")
    code = code.replace(old_end, "      )}")
    print("Replaced successfully")
else:
    # Try more robust replacement if formatting varies
    print("Trying alternative replacement")
    code = re.sub(r'return\s*\(\s*{!isLoggedIn\s*&&', 'return (\n    <>\n      {!isLoggedIn &&', code)
    code = code.replace('      )}\n    <>', '      )}')

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Saved file")
