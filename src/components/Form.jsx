import React, { useState } from 'react';
import { Button, Input } from 'semantic-ui-react';
import { withFirebase } from './Firebase';
import '../styles/Form.css';

const Form = ({ firebase, history }) => {
	const [name, setName] = useState('');

	const submitName = async () => {
		if (name === '' || !name) return alert('You need to enter a name before joining')
		await firebase.askPermission();
		const id = await firebase.createRoom();
		history.push(`/${id}`, { name });
	}

	return (
		<div id="container">
			<h1 id="title">Welcome to Uvid</h1>
			<h2 id="desc">Please enter your name before joining</h2>
			<Input focus placeholder="Add your name" fluid value={name} onChange={e => setName(e.target.value)} id="name" />
			<Button circular id="join-button" onClick={submitName}>Join</Button>
		</div>
	);
}

export default withFirebase(Form);