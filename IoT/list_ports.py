import serial.tools.list_ports

print("=" * 60)
print("Available Serial Ports")
print("=" * 60)
print()

ports = serial.tools.list_ports.comports()

if not ports:
    print("No serial ports found!")
    print("Make sure your Arduino is connected via USB.")
else:
    print(f"Found {len(ports)} port(s):\n")
    for i, port in enumerate(ports, 1):
        print(f"Port {i}:")
        print(f"  Device: {port.device}")
        print(f"  Description: {port.description}")
        print(f"  Hardware ID: {port.hwid}")
        print(f"  Manufacturer: {port.manufacturer or 'Unknown'}")
        print(f"  Product: {port.product or 'Unknown'}")
        print(f"  Serial Number: {port.serial_number or 'Unknown'}")
        print()
        
        # Check if it looks like an Arduino
        desc_lower = port.description.lower()
        if any(keyword in desc_lower for keyword in ['arduino', 'ch340', 'ch341', 'ftdi', 'usb serial']):
            print(f"  >>> This looks like an Arduino! <<<")
            print()

print("=" * 60)
print("To use a specific port, edit server.py and change:")
print("  arduino_port = find_arduino()")
print("  to:")
print(f"  arduino_port = '{ports[0].device if ports else 'COM3'}'")
print("=" * 60)

