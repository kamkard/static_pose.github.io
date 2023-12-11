import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import { Viewer } from './viewer.js';
import { SimpleDropzone } from 'simple-dropzone';
import { Validator } from './validator.js';
import { Footer } from './components/footer';
import queryString from 'query-string';

window.VIEWER = {};

if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
	console.error('The File APIs are not fully supported in this browser.');
} else if (!WebGL.isWebGLAvailable()) {
	console.error('WebGL is not supported in this browser.');
}	

class App {
	/**
	 * @param  {Element} el
	 * @param  {Location} location
	 */
	constructor(el, location) {
		const hash = location.hash ? queryString.parse(location.hash) : {};
		this.options = {
			kiosk: Boolean(hash.kiosk),
			model: hash.model || '',
			preset: hash.preset || '',
			cameraPosition: hash.cameraPosition ? hash.cameraPosition.split(',').map(Number) : null,
		};

		this.el = el; //document.body 
		this.viewer = null;
		this.viewerEl = el.querySelector('.viewer');
		this.spinnerEl = el.querySelector('.spinner');
		// this.dropEl = el.querySelector('.dropzone');
		// this.inputEl = el.querySelector('#file-input');
		this.validator = new Validator(el);

		// this.createDropzone();
		// this.hideSpinner();
		this.loadFromGitHub();

		const options = this.options;

		if (options.kiosk) {
			const headerEl = document.querySelector('header');
			headerEl.style.display = 'none';
		}

		if (options.model) {
			this.view(options.model, '', new Map());
		}
	}

	/**
	 * Sets up the drag-and-drop controller.
	 */
	createDropzone() {
		const dropCtrl = new SimpleDropzone(this.dropEl, this.inputEl);
		dropCtrl.on('drop', ({ files }) => this.load(files));
		dropCtrl.on('dropstart', () => this.showSpinner());
		dropCtrl.on('droperror', () => this.hideSpinner());
	}

	/**
	 * Sets up the view manager.
	 * @return {Viewer}
	 */
	createViewer() {
		// this.viewerEl = document.createElement('div');
		// this.viewerEl.classList.add('viewer');
		// this.dropEl.innerHTML = '';
		// this.el.innerHTML = '';
		// this.dropEl.appendChild(this.viewerEl);
		// this.el.appendChild(this.viewerEl);
		this.viewer = new Viewer(this.viewerEl, this.options);
		return this.viewer;
	}

	/**
	 * Loads a fileset provided by user action.
	 * @param  {Map<string, File>} fileMap
	 */
	load(fileMap) {
		let rootFile;
		let rootPath;
		Array.from(fileMap).forEach(([path, file]) => {
			if (file.name.match(/\.(gltf|glb)$/)) {
				rootFile = file;
				rootPath = path.replace(file.name, '');
			}
		});

		if (!rootFile) {
			this.onError('No .gltf or .glb asset found.');
		}

		this.view(rootFile, rootPath, fileMap);
	}

	/**
	 * Passes a model to the viewer, given file and resources.
	 * @param  {File|string} rootFile
	 * @param  {string} rootPath
	 * @param  {Map<string, File>} fileMap
	 */
	view(rootFile, rootPath, fileMap) {
		if (this.viewer) this.viewer.clear();

		const viewer = this.viewer || this.createViewer();

		const fileURL = typeof rootFile === 'string' ? rootFile : URL.createObjectURL(rootFile);

		const cleanup = () => {
			this.hideSpinner();
			if (typeof rootFile === 'object') URL.revokeObjectURL(fileURL);
		};

		viewer
			.load(fileURL, rootPath, fileMap)
			.catch((e) => this.onError(e))
			.then((gltf) => {
				// TODO: GLTFLoader parsing can fail on invalid files. Ideally,
				// we could run the validator either way.
				if (!this.options.kiosk) {
					this.validator.validate(fileURL, rootPath, fileMap, gltf);
				}
				cleanup();
			});
	}

	/**
	 * @param  {Error} error
	 */
	onError(error) {
		let message = (error || {}).message || error.toString();
		if (message.match(/ProgressEvent/)) {
			message = 'Unable to retrieve this file. Check JS console and browser network tab.';
		} else if (message.match(/Unexpected token/)) {
			message = `Unable to parse file content. Verify that this file is valid. Error: "${message}"`;
		} else if (error && error.target && error.target instanceof Image) {
			message = 'Missing texture: ' + error.target.src.split('/').pop();
		}
		window.alert(message);
		console.error(error);
	}

	showSpinner() {
		this.spinnerEl.style.display = '';
	}

	hideSpinner() {
		this.spinnerEl.style.display = 'none';
	}

	loadFromGitHub() {
		const githubUrl = 'https://raw.githubusercontent.com/kamkard/three-gltf-viewer/main/data/glb_output.glb';
		
		fetch(githubUrl)
			.then(response => {
				if(!response.ok) {
					throw new Error(`Failed to load GLB file from GitHub: ${response.status} ${response.statusText}`);
				}
				return response.arrayBuffer();
			})
			.then(arrayBuffer => {
                const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
                const fileName = 'model.glb'; // Adjust the file name if needed
                const file = new File([blob], fileName);

                // Assuming you have the path where you want to store the file
                const filePath = '';

                // Create or initialize your fileMap
                const fileMap = new Map();
                fileMap.set(filePath, file);

                // Call your view function with the loaded file and fileMap
                this.view(file, filePath, fileMap);
            })
            .catch(error => {
                this.onError(`Error loading GLB file from GitHub: ${error.message}`);
            });

	}

	setupTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.id.replace('-btn', '');
            this.openTab(tabName);
        	});
    	});
	}

	openTab(tabName) {
    // Your existing openTab logic
    // var i, tabContent;
    const selectedTab = document.getElementById(tabName);
    const videoContainer = document.getElementById("video-container");
	const viewerTab = document.getElementById("viewer");

    if (selectedTab == videoContainer){
        videoContainer.classList.add("active");
        viewerTab.classList.remove("active");
    } else if (selectedTab === viewerTab) {
        videoContainer.classList.remove("active");
        viewerTab.classList.add("active");
    // tabContent = document.getElementsByClassName('.tab');
    // for (i = 0; i < tabContent.length; i++) {
    //     tabContent[i].classList.remove("active");
    // 	}
    
    // if (selectedTab) {
    //     selectedTab.classList.add("active"); // Add "active" class to the selected tab
    }
    // document.getElementById(tabName).style.display = "block";
	// tabContents.forEach(tabContent => {
    //     tabContent.style.display = "none";
    // });

    // const selectedTab = document.getElementById(tabName);
    // if (selectedTab) {
    //     selectedTab.style.display = "block";
    // } else {
    //     console.error(`Tab with ID '${tabName}' not found.`);
    // }
	}	
}





// document.body.innerHTML += Footer();

document.addEventListener('DOMContentLoaded', () => {
	const app = new App(document.body, location);
	app.setupTabs(); // Call the function to set up event listeners for tabs
	window.VIEWER.app = app;

	console.info('[glTF Viewer] Debugging data exported as `window.VIEWER`.');
});
