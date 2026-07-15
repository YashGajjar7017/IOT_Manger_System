# import socket

# for i in range(1, 255):
#     ip = f"192.168.4.{i}"
#     s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
#     s.settimeout(0.2)
#     if s.connect_ex((ip, 502)) == 0:
#         print(f"Port 502 open at {ip}")
#     s.close()

from pymodbus.client import ModbusTcpClient

for ip in ["192.168.4.1", "192.168.4.2"]:
    client = ModbusTcpClient(ip, port=502)
    if client.connect():
        print(f"\n--- {ip} ---")
        for fc, name in [(client.read_holding_registers, "holding"), (client.read_input_registers, "input")]:
            try:
                r = fc(address=2000, count=1, device_id=1)
                print(f"{name}: {r}")
            except Exception as e:
                print(f"{name}: {e}")
        client.close()
    else:
        print(f"{ip}: connect failed")