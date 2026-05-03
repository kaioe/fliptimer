
content = open('src/presets-ui.js').read()
balance = 0
lines = content.split('\n')
for line_num, line in enumerate(lines, 1):
    old_balance = balance
    for char in line:
        if char == '{':
            balance += 1
        elif char == '}':
            balance -= 1
    if balance != old_balance:
        if balance == 0 or balance == 1:
            print(f"Line {line_num} balance: {balance} | Content: {line.strip()[:50]}")
