import './style.css';

import QRCode from 'qrcode'
import io, {Socket} from 'socket.io-client'

const fdg = (n: number) => n < 10 ? '0' + n : '' + n

interface Message {
	rev: string
    home: number
    away: number
    remaining?: number
    paused: boolean
    homeTeam?: string
    awayTeam?: string
}

interface GuiElements {
	root: HTMLElement
	homeName: HTMLElement
	awayName: HTMLElement
	homeTeamInput: HTMLInputElement
	awayTeamInput: HTMLInputElement
	homeScoreInput: HTMLInputElement
	homeScoreIncrement: HTMLElement
	homeScoreDecrement: HTMLElement
	awayScoreInput: HTMLInputElement
	awayScoreIncrement: HTMLElement
	awayScoreDecrement: HTMLElement
	timeRemainingInput: HTMLInputElement
	timeRemainingStartStop: HTMLElement
}

function formatTime(time: number) {
	return fdg(Math.floor(time / 60)) + ":" + fdg(time % 60);
}

export class ScoreBoardAdmin {
    params: URLSearchParams = new URLSearchParams(window.location.href.split("?")[1])
    socket: Socket = io({query: {token: this.params?.get('secret') ?? "", uuid: this.params?.get('uuid') ?? ""}});
    endDate: Date = new Date(+new Date() + 35 * 60 * 1000)
    home: number = 0
    away: number = 0
    remaining: number = 35 * 60
    paused: boolean = true
    homeTeam: string = "Uccle Sport"
    awayTeam: string = "Visiteurs"
	private editingTime: boolean = false
	private latestRev: string = ''
	private elements?: GuiElements = undefined
    init() {
		const root = document.getElementById("root")!!
		const homeName = document.getElementById("home-name")!!
		const awayName = document.getElementById("away-name")!!
		const homeTeamInput: HTMLInputElement = document.getElementById("home-team-input")!! as HTMLInputElement
		const awayTeamInput: HTMLInputElement = document.getElementById("away-team-input")!! as HTMLInputElement
		const homeScoreInput: HTMLInputElement = document.getElementById("home-score-input")!! as HTMLInputElement
		const homeScoreIncrement = document.getElementById("home-score-increment")!!
		const homeScoreDecrement = document.getElementById("home-score-decrement")!!
		const awayScoreInput: HTMLInputElement = document.getElementById("away-score-input")!! as HTMLInputElement
		const awayScoreIncrement = document.getElementById("away-score-increment")!!
		const awayScoreDecrement = document.getElementById("away-score-decrement")!!
		const timeRemainingInput: HTMLInputElement = document.getElementById("time-remaining-input")!! as HTMLInputElement
		const timeRemainingStartStop = document.getElementById("time-remaining-start-stop")!!

		this.elements = {
			root,
			homeName,
			awayName,
			homeTeamInput,
			awayTeamInput,
			homeScoreInput,
			homeScoreIncrement,
			homeScoreDecrement,
			awayScoreInput,
			awayScoreIncrement,
			awayScoreDecrement,
			timeRemainingInput,
			timeRemainingStartStop
		}

		this.updateElements(homeScoreInput, awayScoreInput, timeRemainingStartStop, homeName, awayName, homeTeamInput, awayTeamInput, timeRemainingInput, true);

		homeTeamInput.onblur = (e: FocusEvent) => {
			this.homeTeam = (e.target as HTMLInputElement).value
			homeName.innerText = this.homeTeam
			this.update(true)
		}

		awayTeamInput.onblur = (e: FocusEvent) => {
			this.awayTeam = (e.target as HTMLInputElement).value
			awayName.innerText = this.awayTeam
			this.update(true)
		}

		homeScoreInput.onblur = (e: FocusEvent) => {
			this.home = Number((e.target as HTMLInputElement).value)
			this.update()
		}

		homeScoreIncrement.onclick = () => {
			this.home++
			homeScoreInput.value = this.home.toString()
			this.update()
		}

		homeScoreDecrement.onclick = () => {
			this.home = Math.max(this.home - 1, 0)
			homeScoreInput.value = this.home.toString()
			this.update()
		}

		awayScoreInput.onblur = (e: FocusEvent) => {
			this.away = Number((e.target as HTMLInputElement).value)
			this.update()
		}

		awayScoreIncrement.onclick = () => {
			this.away++
			awayScoreInput.value = this.away.toString()
			this.update()
		}

		awayScoreDecrement.onclick = () => {
			this.away = Math.max(this.away - 1, 0)
			awayScoreInput.value = this.away.toString()
			this.update()
		}

		timeRemainingInput.onfocus = (e: FocusEvent) => {
			this.editingTime = true
		}

		timeRemainingInput.onblur = (e: FocusEvent) => {
			const val = (e.target as HTMLInputElement).value
			this.editingTime = false
			if (!val.match(/[0-9][0-9]?:[0-9][0-9]?/)) {
				(e.target as HTMLInputElement).value = formatTime(this.remaining)
				return
			}
			this.remaining = Number(val.split(':')[0]) * 60 + Number(val.split(':')[1])
			this.endDate = new Date(+new Date() + this.remaining * 1000)
			this.update(true)
		}

		timeRemainingStartStop.onclick = (e: MouseEvent) => {
			if (this.remaining === 0 && this.paused) { return }
			this.paused = !this.paused
			;(e.target as HTMLButtonElement).innerHTML = this.paused ? "Start" : "Pause"
			this.update(true)
		}

        QRCode.toCanvas(document.getElementById('qr'), window.location.href, function (error) {
            if (error) console.error(error)
        })

		setInterval(() => {
			if (this.paused) {
				this.endDate = new Date(+new Date() + this.remaining * 1000)
			} else {
				this.remaining = Math.max(0, Math.floor(((+this.endDate) - (+new Date())) / 1000))
				if (this.remaining === 0 && !this.paused) {
					this.paused = true
					this.update(true)
				}
			}
			this.updateElements(homeScoreInput, awayScoreInput, timeRemainingStartStop, homeName, awayName, homeTeamInput, awayTeamInput, timeRemainingInput);
		}, 1000)

		this.socket.on('ping', (msg: Message) => {
 		})

		this.socket.on('update', (msg: Message) => {
			this.updateState(msg, homeScoreInput, awayScoreInput, timeRemainingStartStop, homeName, awayName, homeTeamInput, awayTeamInput, timeRemainingInput);
		});

		this.sync()
		root && (root.classList.remove("hidden"))
	}

	private updateState(msg: Message, homeScoreInput: HTMLInputElement, awayScoreInput: HTMLInputElement, timeRemainingStartStop: HTMLElement, homeName: HTMLElement, awayName: HTMLElement, homeTeamInput: HTMLInputElement, awayTeamInput: HTMLInputElement, timeRemainingInput: HTMLInputElement) {
    	this.latestRev = msg.rev
		this.home = msg.home
		this.away = msg.away
		this.paused = msg.paused
		msg.homeTeam && (this.homeTeam = msg.homeTeam)
		msg.awayTeam && (this.awayTeam = msg.awayTeam)
		this.updateElements(homeScoreInput, awayScoreInput, timeRemainingStartStop, homeName, awayName, homeTeamInput, awayTeamInput, timeRemainingInput, true);

		if (msg.remaining !== undefined) {
			this.remaining = Math.max(0, msg.remaining)
			this.endDate = new Date(+new Date() + this.remaining * 1000)
		}
	}

	private updateElements(homeScoreInput: HTMLInputElement, awayScoreInput: HTMLInputElement, timeRemainingStartStop: HTMLElement, homeName: HTMLElement, awayName: HTMLElement, homeTeamInput: HTMLInputElement, awayTeamInput: HTMLInputElement, timeRemainingInput: HTMLInputElement, full: boolean = false) {
		timeRemainingStartStop.innerHTML = this.paused ? "Start" : "Pause"
		homeName.innerText = this.homeTeam
		awayName.innerText = this.awayTeam
		if (!this.editingTime) {
			timeRemainingInput.value = formatTime(this.remaining)
		}
		if (full) {
			homeScoreInput.value = this.home.toString()
			awayScoreInput.value = this.away.toString()
			homeTeamInput.value = this.homeTeam
			awayTeamInput.value = this.awayTeam
		}
	}

	update(full: boolean = false) {
    	const extra = full ? {
				remaining: this.remaining,
				homeTeam: this.homeTeam,
				awayTeam: this.awayTeam,
			} : {}
		this.socket.emit('update', {
			rev: this.latestRev,
			token: this.params?.get("secret"),
			uuid: this.params?.get("uuid"),
			home: this.home,
			away: this.away,
			paused: this.paused,
			...extra,
		}, (resp: any) => {
			if (resp.status === 409) {
				this.sync();
			}
		})
	}

	private sync() {
		this.socket.emit('sync', {
			token: this.params?.get("secret"),
			uuid: this.params?.get("uuid")
		}, ({status, resp}: { status: number, resp: any }) => {
			if (status === 200) {
				if (resp.remaining != undefined) {
					const els = this.elements
					els && this.updateState(resp,
						els.homeScoreInput,
						els.awayScoreInput,
						els.timeRemainingStartStop,
						els.homeName,
						els.awayName,
						els.homeTeamInput,
						els.awayTeamInput,
						els.timeRemainingInput,
					)
				} else {
					this.update(true)
				}
			} else {
				console.log(`Cannot sync ${status}: `, resp)
			}
		})
	}

	showSettings() {
        console.log("show settings")
        document.getElementById("settings")?.classList?.remove("hidden")
    }

    hideSettings() {
        console.log("hide settings")
        document.getElementById("settings")?.classList?.add("hidden")
    }
}

export const scoreBoardAdmin = new ScoreBoardAdmin()
// @ts-ignore
window.scoreBoardAdmin = scoreBoardAdmin

scoreBoardAdmin.init()
