
class Comment {
    constructor(message, owner, id, visible) {
        this.message = message
        this.owner = owner
        this.id = id
        this.visible = visible
    }
}

var sections = {'went_well': [], "to_improve":[], "action_items": []}
var peer = new Peer()

function SetOwnerName(name){
    console.log(name)
    owner=name
}


function AddCommentToSection(comment, section){
    sections[section].push(comment)
    DisplaySections()
}


function DeleteCommentFromSection(id, section){
    sections[section] = sections[section].filter(comment => comment.id != id)
    DisplaySections()
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
        delete_button.onclick = function(){DeleteCommentFromSection(comment.id, section);}
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
            AddCommentToSection(comment, section)
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
}
var room = new Room()


class MyPeer{
    constructor(peer, conn) {
        this.peer = peer
        this.conn = conn
    }
}
var my_peer = new MyPeer(new Peer(), null)


function CreateConnection(room, new_conn){
    new_conn.on('data', function (data) {
        room.connections.forEach(function(conn, key, map){
            if (new_conn.peer != conn.peer){
                console.log("broadcasting " + data + "to " + conn.peer)
                conn.send(data)
            }
        })
    });
    new_conn.on('close', function () {
        room.connections.delete(new_conn);
    });
    room.connections.set(new_conn.peer.id, new_conn)
    console.log("Connected to: " + new_conn.peer);
}


function CreateRoom(){
    room.room_peer = new Peer()
    room.room_peer.on('open', function (id) {
        // Workaround for peer.reconnect deleting previous id
        if (room.room_peer.id === null) {
            console.log('Received null id from peer open');
            room.room_peer.id = room.last_room_id;
        } else {
            room.last_room_id = room.room_peer.id;
        }
        console.log('room id: ' + room.room_peer.id);
        console.log("Awaiting connection...");
    });
    room.room_peer.on('connection', function (c) {
        CreateConnection(room, c)
    });
}


function ConnectToPeer(peer_id){
    my_peer.conn = my_peer.peer.connect(peer_id);
    my_peer.conn.on('open', function(){
        my_peer.conn.send("hi");
    });
    
    my_peer.conn.on('data', function(data){
        console.log(data)
    });
}


function SendToRoom(message){
    if (my_peer.conn === null){
        return
    }
    my_peer.conn.send(message)
}