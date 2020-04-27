import firebase from 'firebase';

const firebaseConfig = {
	apiKey: "AIzaSyBVza-uyFtJbuvzgWo6_tBazRfLWrljqE4",
	authDomain: "uvid-cb41e.firebaseapp.com",
	databaseURL: "https://uvid-cb41e.firebaseio.com",
	projectId: "uvid-cb41e",
	storageBucket: "uvid-cb41e.appspot.com",
	messagingSenderId: "676209185713",
	appId: "1:676209185713:web:91515e701a31480c77a390",
	measurementId: "G-ECLSNBEGS7"
};

const configuration = {
	iceServers: [
		{
			urls: [
				'stun:stun1.1.google.com:19302',
				'stun:stun2.1.google.com:19302',
			],
		},
	],
	iceCandidatePoolSize: 10,
}

class Firebase {
	constructor() {
		firebase.initializeApp(firebaseConfig);
		this.peerConnection = null;
		this.db = null;
		this.localStream = null;
		this.remoteStream = null;
	}

	askPermission = async () => {
		const stream = await navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true,
		});
		this.localStream = stream;
		this.remoteStream = new MediaStream();
	}

	getLocalStream = () => { return this.localStream; }

	createRoom = async () => {
		this.db = firebase.firestore();
		this.peerConnection = new RTCPeerConnection(configuration);
		const roomRef = await this.db.collection('rooms').doc();

		this.registerPeerConnectionListeners();

		if (!this.localStream) return alert('You must accept video and audio');
		this.localStream.getTracks().forEach(track => {
			this.peerConnection.addTrack(track, this.localStream);
		});

		const callerCandidatesCollection = roomRef.collection('callerCandidates');
		this.peerConnection.addEventListener('icecandidate', event => {
			if (!event.candidate) return console.log('Got final candidate !');
			console.log('Got candidate ', event.candidate);
			callerCandidatesCollection.add(event.candidate.toJSON());
		})

		const offer = await this.peerConnection.createOffer();
		await this.peerConnection.setLocalDescription(offer);
		const roomWithOffer = {
			offer: {
				type: offer.type,
				sdp: offer.sdp,
			}
		}
		roomRef.set(roomWithOffer);
		const roomId = roomRef.id;

		this.peerConnection.addEventListener('track', event => {
			console.log('Got remote track: ', event.streams[0]);
			event.streams[0].getTracks.forEach(track => {
				console.log('Add a track to the remoteStream:', track);
				this.remoteStream.addTrack(track);
			})
		});

		roomRef.onSnapshot(async snapshot => {
			const data = snapshot.data();
			if (!this.peerConnection.currentRemoteDescription && data && data.answer) {
				console.log('Got remote description: ', data.answer);
				const rtcSessionDescription = new RTCSessionDescription(data.answer);
				await this.peerConnection.setRemoteDescription(rtcSessionDescription);
			}
		});

		roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
			snapshot.docChanges().forEach(async change => {
				if (change.type === 'added') {
					let data = change.docc.data();
					console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
					await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
				}
			});
		});

		return roomId;
	}

	joinRoom = async id => {
		this.db = firebase.firestore();
		const roomRef = this.db.collection('rooms').doc(id);
		const roomSnapshot = await roomRef.get();
		console.log('Got room:', roomSnapshot.exists);

		if (!roomSnapshot.exists) return;
		console.log('Create PeerConnection with configuration: ', configuration);
		this.peerConnection = new RTCPeerConnection(configuration);
		this.registerPeerConnectionListeners();
		if (!this.localStream) return alert('You need to accept video and audio');
		this.localStream.getTracks().forEach(track => {
			this.peerConnection.addTrack(track, this.localStream);
		});

		const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
		this.peerConnection.addEventListener('icecandidate', event => {
			if (!event.candidate) return console.log('Got final candidate!');
			console.log('Got candidate: ', event.candidate);
			calleeCandidatesCollection.add(event.candidate.toJSON());
		});

		this.peerConnection.addEventListener('track', event => {
			console.log('Got remote track:', event.streams[0]);
			event.streams[0].getTracks().forEach(track => {
				console.log('Add a track to the remoteStream', track);
				this.remoteStream.addTrack(track);
			});
		});

		const offer = roomSnapshot.data().offer;
		console.log('Got offer:', offer);
		await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
		const answer = await this.peerConnection.createAnswer();
		console.log('Created answer:', answer);
		await this.peerConnection.setLocalDescription(answer);
		const roomWithAnswer = {
			answer: {
				type: answer.type,
				sdp: answer.sdp,
			}
		};
		await roomRef.update(roomWithAnswer);
		roomRef.collection('callerCandidates').onSnapshot(snapshot => {
			snapshot.docChanges().forEach(async change => {
				if (change.type === 'added') {
					let data = change.doc.data();
					console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
					await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
				}
			})
		})
	}

	registerPeerConnectionListeners = () => {
		this.peerConnection.addEventListener('icegatheringstatechange', () => {
			console.log(
				`ICE gathering state changed: ${this.peerConnection.iceGatheringState}`);
		});

		this.peerConnection.addEventListener('connectionstatechange', () => {
			console.log(`Connection state change: ${this.peerConnection.connectionState}`);
		});

		this.peerConnection.addEventListener('signalingstatechange', () => {
			console.log(`Signaling state change: ${this.peerConnection.signalingState}`);
		});

		this.peerConnection.addEventListener('iceconnectionstatechange ', () => {
			console.log(
				`ICE connection state change: ${this.peerConnection.iceConnectionState}`);
		});
	}
}

export default Firebase;