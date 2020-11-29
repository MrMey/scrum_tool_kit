
class Comment {
    constructor(message, owner, id, visible) {
        this.message = message
        this.owner = owner
        this.id = id
        this.visible = visible
    }
}

var sections = {'went_well': [], "to_improve":[], "action_items": []}


function GetNewPeer(){
    return new Peer(options={
        secure: true,
        host: 'peerjs-broker.herokuapp.com', 
        port: 443,
        path: 'myapp'
    });
}


function SetOwnerName(name){
    console.log(name)
    owner=name
}


function DisplayListInSection(section, section_element){
    section_list = section_element.getElementsByTagName("ul")
    if (section_list.length = 0){
        section_element.removeChild(section_list[0])
    }

    if (section.length = 0){
        return
    }
    section_list = document.createElement("ul")
    for (comment of sections[section]){
        comment_element = document.createElement("li")
        comment_element.classList.add("comment")

        if ((document.getElementById("mask_button").checked) && 
            (comment.owner != document.getElementById("owner_name").value)) {
            comment_element.appendChild(document.createTextNode("XXXXXXXXXXXXX"))
        } else {
            comment_element.appendChild(document.createTextNode(comment.message))
        }

        delete_button = document.createElement("button")
        delete_button.innerHTML = "Delete"
        delete_button.onclick = function(){MyPeerDeleteCommentFromSection(comment.id, section);}
        comment_element.appendChild(delete_button)

        section_list.appendChild(comment_element)
        section_element.appendChild(section_list)
    }
}


function DisplaySection(container, section){
    section_div = document.createElement("div")
    section_div.id = "section_" + section
    section_div.classList.add("column")
    section_div.appendChild(document.createTextNode(section))

    add_comment = document.createElement("input")
    add_comment.type = "text"
    add_comment.value = "type comment here"
    add_comment.addEventListener("keyup", function(event){
        if (event.key == "Enter"){
            var comment = new Comment(event.target.value, document.getElementById("owner_name").value)
            MyPeerAddCommentToSection(comment, section)
        }
    })
    section_div.appendChild(add_comment)

    DisplayListInSection(section, section_div)
    container.appendChild(section_div)
}


function DisplaySections(){
    main = document.getElementById("container")
    while (main.firstChild) {
        main.removeChild(main.lastChild);
      }
    
    for (section in sections){
        DisplaySection(container, section)
    }
}


class Room{
    constructor(room_peer) {
        this.room_peer = room_peer
        this.last_room_id = null
        this.connections = new Map()
    }

    create(){
        this.room_peer = GetNewPeer()
        this.room_peer.on('open', (id)=>{
            // Workaround for peer.reconnect deleting previous id
            if (this.room_peer.id === null) {
                console.log('Received null id from peer open');
                this.room_peer.id = this.last_room_id;
            } else {
                this.last_room_id = this.room_peer.id;
            }
            console.log('room id: ' + this.room_peer.id);
            console.log("Awaiting connection...");
            DisplayRoom()
        });
        this.room_peer.on('connection', (new_conn)=>{
            new_conn.on('data', (data)=>{
                this.broadcast_data(data, new_conn.peer)
            });
            new_conn.on('close', ()=>{
                this.connections.delete(new_conn);
            });
            this.connections.set(new_conn.peer, new_conn)
            console.log("Connected to: " + new_conn.peer);
            this.broadcast_status()
        });
    }
    
    broadcast_data(data, sending_peer){
        this.connections.forEach(function(conn){
            if (sending_peer != conn.peer){
                console.log("broadcasting " + data + "to " + conn.peer)
                conn.send(data)
            }
        })
    }

    broadcast_status(){
        var peers = []
        this.connections.forEach(function(value){peers.push(value.peer)})
        var data = {'action': 'status', 'peers': peers}
        this.broadcast_data(data)
    }
}
var room = new Room()


class MyPeer{
    constructor(peer) {
        this.peer = peer
        this.conn = null
        this.others = []
        this.actions = {}
    }

    connect_to_room(room_id){
        console.log("Trying to connect to " + room_id)
        this.conn = this.peer.connect(room_id);
        console.log("conn created...")
        this.conn.on('open', ()=>{
            console.log("Peer connection open...")
            this.conn.send({"action":"message", "msg":"hi"});
        });
        
        this.conn.on('data', (data)=>{
            if (data["action"] in this.actions){
                this.actions[data["action"]](data)
            } else {
                console.log("unknown action: " + data["action"])
            }
        });
    }
}

var my_peer = new MyPeer(GetNewPeer())
my_peer.actions["message"] = console.log
my_peer.actions["status"] = UpdateStatus


function ActionAddComment(data){
    AddCommentToSection(data['message'], data['section'])
}

function ActionDeleteComment(data){
    DeleteCommentFromSection(data['message'], data['section'])
}
my_peer.actions["add_comment"] = ActionAddComment
my_peer.actions["delete_comment"] = ActionDeleteComment


function AddCommentToSection(comment, section){
    sections[section].push(comment)
    DisplaySections()
}


function MyPeerAddCommentToSection(comment, section){
    AddCommentToSection(comment, section)
    my_peer.conn.send({"action": "add_comment", "message": comment, "section": section})

}

function DeleteCommentFromSection(id, section){
    sections[section] = sections[section].filter(comment => comment.id != id)
    DisplaySections()
}

function MyPeerDeleteCommentFromSection(comment, section){
    DeleteCommentFromSection(comment, section)
    my_peer.conn.send({"action": "delete_comment", "message": comment, "section": section})

}


function GetInviteUrl(room_id){
    return window.location.href + "?room_id=" + room_id 
}


function DisplayRoom(){
    room_id = document.getElementById("room_id")
    room_id.value = room.room_peer.id

    invite_link = document.getElementById("invite_url_link")
    url = GetInviteUrl(room.room_peer.id)
    invite_link.href = url
    invite_link.innerHTML = url
}


function DisplayPeerList(){
    peer_list_container = document.getElementById("peer_list_container")
    if (peer_list_container.firstChild){
        peer_list_container.removeChild(peer_list_container.lastChild);
    }
    
    peer_list = document.createElement("ul")    
    peer_list.innerHTML = "Connected peers:"
    my_peer.others.forEach(function(peer_id){
        room_peer = document.createElement("li")
        room_peer.innerHTML = peer_id
        peer_list.appendChild(room_peer)
    })
    peer_list_container.appendChild(peer_list)
}


function UpdateStatus(status){
    my_peer.others = []
    status["peers"].forEach(peer_id => my_peer.others.push(peer_id))
    DisplayPeerList()
}


function ConnectToRoom(){
    peer_id = document.getElementById("room_id").value
    my_peer.connect_to_room(peer_id)
}


function SendToRoom(message){
    if (my_peer.conn === null){
        return
    }
    my_peer.conn.send(message)
}


function DetectRoom(){
    urlParams = new URLSearchParams(window.location.search)
    if (urlParams.has("room_id")){
        room_id = urlParams.get("room_id")
        document.getElementById("room_id").value = room_id
    }
}