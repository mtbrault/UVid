import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { withFirebase } from './Firebase'
import '../styles/Call.css';

const Call = ({ firebase, history }) => {
	const { id } = useParams();

	useEffect(() => {
		if (!id) history.back();
	}, [history, id]);

	return (
		<video ref={video => video && (video.srcObject = firebase.getLocalStream())} muted autoPlay playsInline ></video>
	);
}

export default withFirebase(Call);