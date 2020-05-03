import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { withFirebase } from './Firebase'
import '../styles/Call.css';

const Call = ({ firebase, history }) => {
	const { id } = useParams();
	const [otherName, setOtherName] = useState('Non connecté');
	const [thirdName, setThirdName] = useState('Non connecté');

	useEffect(() => {
		if (!id) history.push('/');
		if (firebase.getName() === '')
			history.push('/', { id });
		else
			firebase.joinRoom(id, setOtherName, setThirdName);
	}, [id, history, firebase]);

	return (
		<div style={{ display: "flex", justifyContent: "center" }}>
			<div>
				<video ref={video => video && (video.srcObject = firebase.getLocalStream())} muted autoPlay playsInline ></video>
				<p>{firebase.getName()}</p>
				<video ref={video => video && (video.srcObject = firebase.getRemoteStream())} autoPlay playsInline></video>
				<p>{otherName}</p>
			</div>
			<div>
				<video ref={video => video && (video.srcObject = firebase.getRemoteStream2())} autoPlay playsInline></video>
				<p>{thirdName}</p>
			</div>
		</div>
	);
}

export default withFirebase(Call);