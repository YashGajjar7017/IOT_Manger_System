with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace '</div>/div>' with '</div>'
code = code.replace('</div>/div>', '</div>')

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed typo successfully")
