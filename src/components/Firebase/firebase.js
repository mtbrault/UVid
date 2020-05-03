import * as firebase from 'firebase';

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
		this.peerConnection2 = null;
		this.localStream = null;
		this.remoteStream = null;
		this.remoteStream2 = null;
		this.name = '';
	}

	askPermission = async () => {
		const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
		this.localStream = stream;
		this.remoteStream = new MediaStream();
		this.remoteStream2 = new MediaStream();
	}

	setName = name => { this.name = name }

	getName = () => { return this.name }

	getLocalStream = () => { return this.localStream; }

	getRemoteStream = () => { return this.remoteStream; }

	getRemoteStream2 = () => { return this.remoteStream2; }

	createRoom = async () => {
		const db = firebase.firestore();
		const roomRef = await db.collection('rooms').doc();

		await roomRef.set({});
		console.log(`New room created with id : ${roomRef.id}`);
		return roomRef.id;
	}

	joinRoom = async (id, setOtherName, setThirdName) => {
		const db = firebase.firestore();
		const roomRef = db.collection('rooms').doc(`${id}`);
		const snapshot = await roomRef.get();

		if (!snapshot.exists) {
			alert("This room doesn't exist");
			return false;
		}
		this.peerConnection = new RTCPeerConnection(configuration);
		this.peerConnection2 = new RTCPeerConnection(configuration);
		this.localStream.getTracks().forEach(track => {
			this.peerConnection.addTrack(track, this.localStream);
			this.peerConnection2.addTrack(track, this.localStream);
		});
		const offers = await snapshot.data();
		const userId = Object.keys(offers).length;
		const calleeCandidatesCollection = roomRef.collection(`calleeCandidates${userId}`);
		this.peerConnection.addEventListener('icecandidate', event => {
			if (!event.candidate) return false;
			calleeCandidatesCollection.add(event.candidate.toJSON());
		});
		this.peerConnection2.addEventListener('icecandidate', event => {
			if (!event.candidate) return false;
			calleeCandidatesCollection.add(event.candidate.toJSON());
		});
		this.peerConnection.addEventListener('track', event => {
			event.streams[0].getTracks().forEach(track => {
				this.remoteStream.addTrack(track);
			});
		});
		this.peerConnection2.addEventListener('track', event => {
			event.streams[0].getTracks().forEach(track => {
				this.remoteStream2.addTrack(track);
			});
		});
		if (userId === 0) {
			const offer = await this.peerConnection.createOffer();
			const offer2 = await this.peerConnection2.createOffer();
			await this.peerConnection.setLocalDescription(offer);
			await this.peerConnection2.setLocalDescription(offer2);
			const answer = {
				offer0: {
					name: this.name,
					offers: [{}, {
						type: offer.type,
						sdp: offer.sdp,
					}, {
						type: offer2.type,
						sdp: offer2.sdp,
					}],
				}
			};
			await roomRef.update(answer);
			roomRef.onSnapshot(async snapshot => {
				const data = snapshot.data();
				if (!this.peerConnection.currentRemoteDescription && data && data.offer1) {
					const rtcSessionDescription = new RTCSessionDescription(data.offer1.offers[0]);
					await this.peerConnection.setRemoteDescription(rtcSessionDescription);
					setOtherName(data.offer1.name);
				}
				if (!this.peerConnection2.currentRemoteDescription && data && data.offer2) {
					const rtcSessionDescription = new RTCSessionDescription(data.offer2.offers[0]);
					await this.peerConnection2.setRemoteDescription(rtcSessionDescription);
					setThirdName(data.offer2.name);
				}
			});
			roomRef.collection(`calleeCandidates${1}`).onSnapshot(snapshot => {
				snapshot.docChanges().forEach(async change => {
					if (change.type === 'added') {
						let data = change.doc.data();
						await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
					}
				});
			});
			roomRef.collection(`calleeCandidates${2}`).onSnapshot(snapshot => {
				snapshot.docChanges().forEach(async change => {
					if (change.type === 'added') {
						let data = change.doc.data();
						await this.peerConnection2.addIceCandidate(new RTCIceCandidate(data));
					}
				});
			});
		} else if (userId === 1) {
			await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offers.offer0.offers[1]));
			const answer = await this.peerConnection.createAnswer();
			const offer2 = await this.peerConnection2.createOffer();
			await this.peerConnection.setLocalDescription(answer);
			await this.peerConnection2.setLocalDescription(offer2);
			roomRef.onSnapshot(async snapshot => {
				const data = snapshot.data();
				if (!this.peerConnection2.currentRemoteDescription && data && data.offer2) {
					const rtcSessionDescription = new RTCSessionDescription(data.offer2.offers[1]);
					await this.peerConnection2.setRemoteDescription(rtcSessionDescription);
					setThirdName(data.offer2.name);
				}
			});
			const roomWithAnswer = {
				offer1: {
					name: this.name,
					offers: [{
						type: answer.type,
						sdp: answer.sdp,
					}, {}, {
						type: offer2.type,
						sdp: offer2.sdp,
					}]
				}
			};
			await roomRef.update(roomWithAnswer);
			roomRef.collection(`calleeCandidates${0}`).onSnapshot(snapshot => {
				snapshot.docChanges().forEach(async change => {
					if (change.type === 'added') {
						let data = change.doc.data();
						await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
					}
				});
			});
			roomRef.collection(`calleeCandidates${2}`).onSnapshot(snapshot => {
				snapshot.docChanges().forEach(async change => {
					if (change.type === 'added') {
						let data = change.doc.data();
						await this.peerConnection2.addIceCandidate(new RTCIceCandidate(data));
					}
				});
			});
			setOtherName(offers.offer0.name);
		} else if (userId === 2) {
			await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offers.offer0.offers[2]));
			await this.peerConnection2.setRemoteDescription(new RTCSessionDescription(offers.offer1.offers[2]));;
			const answer = await this.peerConnection.createAnswer();
			const answer2 = await this.peerConnection2.createAnswer();
			await this.peerConnection.setLocalDescription(answer);
			await this.peerConnection2.setLocalDescription(answer2);
			const roomWithAnswer = {
				offer2: {
					name: this.name,
					offers: [{
						type: answer.type,
						sdp: answer.sdp,
					}, {
						type: answer2.type,
						sdp: answer2.sdp,
					}, {}]
				}
			};
			await roomRef.update(roomWithAnswer);
			roomRef.collection(`calleeCandidates${0}`).onSnapshot(snapshot => {
				snapshot.docChanges().forEach(async change => {
					if (change.type === 'added') {
						let data = change.doc.data();
						await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
					}
				});
			});
			roomRef.collection(`calleeCandidates${1}`).onSnapshot(snapshot => {
				snapshot.docChanges().forEach(async change => {
					if (change.type === 'added') {
						let data = change.doc.data();
						await this.peerConnection2.addIceCandidate(new RTCIceCandidate(data));
					}
				});
			});
			setOtherName(offers.offer0.name);
			setThirdName(offers.offer1.name);
		}
		return true;
	}
}

export default Firebase;
