import React, {Component} from 'react';
import './App.css';
import MonacoEditor from 'react-monaco-editor';
import {Button, Dropdown} from 'react-bootstrap';
import ReactJsonSyntaxHighlighter from 'react-json-syntax-highlighter'
import Form from "react-bootstrap/Form";
import {evaluateCode, getIntegrations} from "./RequestManager";
import {Modal} from "react-bootstrap";
import Cookies from 'universal-cookie';
import {processActivities} from "./ActivityProcessor";

const editorOptions = {
	selectOnLineNumbers: true,
	autoIndent: true,
	colorDecorators: true,
	copyWithSyntaxHighlighting: true,
	fontSize: 18
};

const cookies = new Cookies();

const initialCode = cookies.get('code') === undefined ?
	`import request from 'superagent';  
	
	//Parameters must be methods
async function connect(requestLogin, requestWebView) {
  const { username, password } = await requestLogin();

  return {
    username,
    password,
  };
}

//Clear state after completion
function disconnect() {
  return {};
}

//Using State retrieved from login fetch data 
async function collect(state, { logWarning }) {
  return { activities: [], state };
}

//Configure how your integration is displayed
const config = {
  label: '',
  description: '',
  country: '', //i.e. UK, DK 
  isPrivate: true,
  type: null,
};` : cookies.get('code');


class App extends Component {
	state = {
		functions: null,
		results: {},
		code: initialCode,
		previousRuns: cookies.get('previous-runs'),
		envRefList: []
	};


	authRefs = {
		username: React.createRef(),
		password: React.createRef()
	};



	constructor(props) {
		super(props);
		this.populateIntegrations();

	}

	async populateIntegrations() {
		this.setState({
			integrations: {
				all: await getIntegrations(),
				selected: null
			}
		});
	}

	render() {
		return (
			<div>
				<div>
					<img style={{
						marginTop: '10px',
						flex: 1
					}} src="tmrow-light.png"/>
					<h1 style={{float: 'right', marginRight: '70%'}}>
						Developer Playground </h1>
				</div>
				{this.authForm()}
				{this.testResults()}
				{this.state.integrations && this.state.integrations.view ? this.viewIntegrationModal() : ""}
				{this.state.previousRuns ? this.codeHistoryDropdown() : ""}
				{this.environmentPanel()}
				{this.state.results.activities ? this.activityDisplay() : ""}

				<MonacoEditor
					height="850"
					width="1300"
					language="javascript"
					theme="vs-light"
					value={this.state.code}
					options={editorOptions}
					onChange={v => this.setState({code: v})}
				/>
			</div>
		);
	}

	async interpretJS() {
		let previousRuns = cookies.get('previous-runs');

		if (cookies.get('code') !== undefined) {
			if (previousRuns === undefined) previousRuns = {};

			previousRuns['Run at: ' + new Date().toLocaleString()] = this.state.code;
			cookies.set('previous-runs', previousRuns);
			this.setState({previousRuns});
		}

		cookies.set('code', this.state.code);
		cookies.set('username', this.authRefs.username.current.value);
		cookies.set('password', this.authRefs.password.current.value);

		let results = await evaluateCode(this.state.code,
				this.authRefs.username.current.value,
				this.authRefs.password.current.value,
				getEnvAsObject(this.state.envRefList));

		results.activities = processActivities(results.collect.activities);

		this.setState({results});

		function getEnvAsObject(refs) {
			let obj = {};
			refs.forEach(r => obj[r.key.current.value] = r.value.current.value);
			return obj;
		}
	}

	codeHistoryDropdown() {
		return <Dropdown>
			<Dropdown.Toggle variant="secondary" size="lg">Code History</Dropdown.Toggle>

			<Dropdown.Menu>
				{Object.keys(this.state.previousRuns).map(codeVersion => <Dropdown.Item
					onClick={() => this.setState({code: this.state.previousRuns[codeVersion]})}>{codeVersion}</Dropdown.Item>)}
			</Dropdown.Menu>
		</Dropdown>
	}


	//TODO move to component
	testResults() {
		return <div className="test-results panel panel-default">
			<div className="panel-header" style={{marginLeft: '10px'}}>
				<h1>Test Results <Button variant="secondary" style={{fontSize: '26px'}}
				                         onClick={() => this.interpretJS()}> Run </Button></h1>
			</div>
			<div className="panel-body">
				{this.state.integrations ? this.integrationPanel() : ""}

				{this.state.results.connect ? <div><h3>Connect</h3>
					{<ReactJsonSyntaxHighlighter obj={this.state.results.connect}/>} </div> : ""}
				{this.state.results.collect ? <div className="json-display"><h3>Collect</h3>
					{<ReactJsonSyntaxHighlighter obj={this.state.results.collect}/>}</div> : ""}
				{this.state.results.disconnect ? <div><h3>Disconnect</h3>
					{<ReactJsonSyntaxHighlighter obj={this.state.results.disconnect}/>} </div> : ""}
				{this.state.results.config ? <div><h3>Config</h3> {<ReactJsonSyntaxHighlighter obj={this.state.results.config}/>}</div> : ""}
			</div>
		</div>
	}

	//TODO move to component
	authForm() {
		return <div className="auth-input panel panel-default">
			<div className="panel-header">
				<h1 style={{marginLeft: '10px'}}>Auth Input </h1>
			</div>
			<hr/>
			<div className="panel-body">
				<Form>
					<Form.Group>
						<Form.Label>Username</Form.Label>
						<Form.Control placeholder="Username" ref={this.authRefs.username}/>
					</Form.Group>

					<Form.Group>
						<Form.Label>Password</Form.Label>
						<Form.Control type="password" placeholder="Password" ref={this.authRefs.password}/>
					</Form.Group>
				</Form>
			</div>
		</div>
	}

	//TODO move to component
	integrationPanel() {
		return <div>
			Currently selected: {this.state.integrations.selected}
			<Dropdown>
				<Dropdown.Toggle variant="secondary" size="lg">Integrations</Dropdown.Toggle>

				<Dropdown.Menu>
					{Object.keys(this.state.integrations.all).map(i => <Dropdown.Item
						onClick={() => {
							let integrations = this.state.integrations;
							integrations.selected = i;
							this.setState({integrations})
						}}>{i}</Dropdown.Item>)}
				</Dropdown.Menu>
			</Dropdown>
			<Button variant="secondary" size="lg"
			        onClick={() =>
				        this.setState({code: this.state.integrations.all[this.state.integrations.selected]})}>
				Load </Button>
			<Button variant="secondary" size="lg"
			        onClick={() => {
				        let integrations = this.state.integrations;
				        integrations.view = this.state.integrations.all[this.state.integrations.selected];
				        this.setState({integrations})
			        }}> View </Button>
			<Button variant="secondary" size="lg"
			        onClick={() => this.setState({code: initialCode})}>Reset </Button>
		</div>
	}

	viewIntegrationModal() {
		return (<Modal animation={false} show={true} size="lg">
			<Modal.Header closeButton>
				<Modal.Title>Code for {this.state.integrations.selected}</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<pre>
					<code>
						{this.state.integrations.all[this.state.integrations.selected]}
					</code>
				</pre>
			</Modal.Body>
			<Modal.Footer>
				<Button onClick={() => {
					let integrations = this.state.integrations;
					integrations.view = null;
					this.setState({integrations})
				}}> Close </Button>
			</Modal.Footer>
		</Modal>)
	}

	environmentPanel() {
		return <div className="panel panel-default env-input" style={{overflowY: 'scroll'}}>
			<div className="panel-header">
				<h1 className="title">Environment Variables &nbsp;
					<Button onClick={() => this.addEnvInput()} size="lg" variant="secondary">Add</Button></h1>
					Use <code>import env from './env'</code> and access items with <code>env.key</code>
			</div>
			<div className="panel-body">
				{this.state.envRefList.map(e => <Form>
					<Form.Group className="col-xs-6">
						<Form.Control placeholder="Key" ref={e.key}/>
					</Form.Group>

					<Form.Group className="col-xs-6">
						<Form.Control placeholder="Value" ref={e.value}/>
					</Form.Group>
				</Form>)}
			</div>
		</div>
	}

	addEnvInput() {
		let envRefList = this.state.envRefList;
		envRefList.push({
			key: React.createRef(),
			value: React.createRef()
		});
		this.setState({envRefList});
	}

	activityDisplay() {
		return <div className="panel panel-default activity-display">
			<div className="panel-header"><h1 className="title">Activities</h1></div>
			<div className="panel-body">
				<p>Total watt hours: {this.state.results.activities.wattHours}</p>
				<p>Start date: {this.state.results.activities.startDate} to end date:
					{this.state.results.activities.endDate}</p>
				<p>Watt hours per day: {this.state.results.activities.wattsPerDay}</p>
			</div>
		</div>
	}
}

export default App;
