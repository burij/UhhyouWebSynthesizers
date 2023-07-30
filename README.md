# UhhyouWebSynthesizers
A collection of sample generators that run on browser.

- [Index Page](https://ryukau.github.io/UhhyouWebSynthesizers/)

Generators in this collection outputs wav file to use on external DAW or sampler. If you are looking for instruments or effects that runs on real-time, take a look at [my plugin repository](https://github.com/ryukau/VSTPlugins).

# How to Use without Internet
This section is written for non-programmer.

1. Install [Python 3](https://www.python.org/).
2. Download and extract (or unzip) this repository somewhere. Extracted directory is refered as `UhhyouWebSynthesizers` in following command.
3. Open terminal (PowerShell on Windows), and run following command.

```bash
cd path/to/UhhyouWebSynthesizers
python server.py
```

- Replace `path/to` according to your environment.
- `python server.py` automatically opens `index.html` on your browser.
- If `python` line fails, try replacing `python` to `python3`.

To update, delete existing `UhhyouWebSynthesizers` directory and download again. Or, install [Git](https://git-scm.com/) and run following command.

```bash
cd path/to/UhhyouWebSynthesizers
git pull
```

# License
Apache-2.0 except `lib` directory. `LICENSE.txt` contains complete Apache-2.0 license text.

All codes in `lib` follow licenses of original authors.
