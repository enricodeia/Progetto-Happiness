# TD Hand FX — control bridge

Python bridge to control a TouchDesigner project via OSC.

## Setup

```bash
pip install python-osc
```

## In TouchDesigner

1. In the network, drop an `OSC In CHOP`.
2. Set **Network Port** = `7000`, **Active** = On.
3. Bind any parameter to a channel: right-click the parameter → **Bind** → reference like `op('oscin1')['/particles/count']`.

## Usage

```bash
python td_control.py burst
python td_control.py count 80000
python td_control.py color 1 0.4 0.9
python td_control.py preset fire
python td_control.py preset water
python td_control.py preset lightning
python td_control.py preset smoke
python td_control.py preset magic
```

## OSC channels exposed

| Address              | Type       | Meaning                       |
|----------------------|------------|-------------------------------|
| `/particles/burst`   | int        | trigger one-shot burst        |
| `/particles/count`   | int        | particle count                |
| `/particles/color`   | float[3]   | rgb 0-1                       |
| `/particles/life`    | float      | lifetime seconds              |
| `/particles/force`   | float      | force magnitude               |
