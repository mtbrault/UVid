import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { withFirebase } from './Firebase'
import '../styles/Call.css';

const Call = ({ firebase, history }) => {
	const { id } = useParams();
	const [otherName, setOtherName] = useState('Non connecté');

	useEffect(() => {
		if (!id) history.push('/');
		if (firebase.getName() === '')
			history.push('/', { id });
		else
			firebase.joinRoom(id, setOtherName);
	}, [id, history, firebase]);

	return (
		<div style={{ display: "flex", justifyContent: "center" }}>
			<video id="localVideo" ref={video => video && (video.srcObject = firebase.getLocalStream())} muted autoPlay playsInline ></video>
			<p>{firebase.getName()}</p>
			<video id="remoteVideo" ref={video => video && (video.srcObject = firebase.getRemoteStream())} autoPlay playsInline></video>
			<p>{otherName}</p>
		</div>
	);
}

export default withFirebase(Call);