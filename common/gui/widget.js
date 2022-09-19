export {BarBox} from "./barbox.js";
export {NumberInput} from "./numberinput.js";
export {WaveView} from "./waveview.js";

export class Button {
  constructor(parent, label, onClickFunc) {
    this.element = document.createElement("input");
    this.element.type = "button";
    this.element.value = label;
    this.element.addEventListener("click", (event) => this.onClick(event), false);
    this.onClickFunc = onClickFunc;
    parent.appendChild(this.element);
  }

  onClick(event) { this.onClickFunc(event); }
}

export class PullDownMenu {
  constructor(parent, label, menus, defaultValue, onChangeFunc) {
    this.onChangeFunc = onChangeFunc;
    this.options = [];

    this.div = document.createElement("div");
    this.div.className = "pullDownMenu";
    if (typeof label === 'string' || label instanceof String) {
      this.divLabel = document.createElement("div");
      this.divLabel.className = "numberInputLabel";
      this.divLabel.textContent = label;
      this.div.appendChild(this.divLabel);
    }
    this.select = document.createElement("select");
    this.div.appendChild(this.select);
    parent.appendChild(this.div);

    this.select.addEventListener("change", (event) => this.onChange(event), false);

    this.addArray(menus);
    this.setValue(defaultValue, false);
  }

  get value() { return this.select.value; }

  setValue(value, triggerOnChange = true) {
    const backup = this.select.value;
    this.select.value = value;
    if (this.select.selectedIndex < 0) {
      this.select.value = backup;
      console.warn("PullDownMenu: Invalid value.");
      return;
    }
    this.refreshValue(this.select, triggerOnChange);
  }

  setIndex(index, triggerOnChange = true) {
    if (index < 0 || index >= this.options.length) {
      console.warn("PullDownMenu: Index out of range.");
      return;
    }
    this.select.value = this.options[index].value;
    this.refreshValue(this.select, triggerOnChange);
  }

  onChange(event) { this.refreshValue(event.target, true); }

  refreshValue(select, triggerOnChange) {
    if (triggerOnChange) this.onChangeFunc(select.value);
  }

  add(menu) {
    if (typeof menu !== 'string' && !(menu instanceof String)) {
      console.log("PullDownMenu.add() failed to invalid type.");
    }
    let option = document.createElement('option');
    option.textContent = menu;
    option.value = menu;
    this.options.push(option);
    this.select.appendChild(option);
  }

  // `menus` is array of strings.
  addArray(menus) {
    for (const menu of menus) this.add(menu);
  }
}
