class Input {
	constructor() {
		this._keyStates = {};
	}

	update() {
		Object.keys(this._keyStates).forEach((key) => {
			if(this._keyStates[key] === 2)
				this._keyStates[key] === 1;
		});
	}

	trigger(key) {
		this._keyStates[key] = 2;
	}

	release(key) {
		delete this._keyStates[key];
	}

	isPress(key) {
		return this._keyStates[key] === 2;
	}

	isDown(key) {
		return this._keyStates[key] === 2 || this._keyStates[key] === 1;
	}
}