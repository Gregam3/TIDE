import request from 'superagent';


export function getIntegrations() {
	return request
		.get('http://' + window.location.hostname + ':3001/get-integrations')
		.then(res => {
			return JSON.parse(res.text);
		})
		.catch(err => {
			console.log(err);
			return null;
		});
}

export function evaluateCode(code, authDetails, env, id, stateInjection) {
	//Cannot use get with body from browser
	console.log(stateInjection)
	return request
		.post('http://' + window.location.hostname + ':3001/evaluate-code')
		.send({code, authDetails, env, id, stateInjection})
		.then(res => JSON.parse(res.text))
		.catch(err => {
			console.log(err);
			return null;
		});
}
