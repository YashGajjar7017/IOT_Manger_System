from pathlib import Path


def test_firmware_uses_explicit_ap_hostname_override():
    firmware_path = Path(__file__).resolve().parents[1] / 'firmware' / 'firmware' / 'firmware.ino'
    content = firmware_path.read_text(encoding='utf-8')

    assert 'buildDeviceName()' in content, 'Expected a helper that builds the device name.'
    assert 'softAPsetHostname' in content, 'Expected the firmware to explicitly set the AP hostname.'
    assert 'RMS-FIRMWARE-' in content, 'Expected the firmware to use the RMS-FIRMWARE naming prefix.'
