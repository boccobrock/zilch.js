$(function(){
    $("#submit-name").click(function() {
        $("#welcome-box").hide();
        playZilch($("#name").val());
    });
});

function playZilch(name) {
	// Generate an unique ID
	var id = Math.round($.now()*Math.random());
	var clients = {};
    var currentPlayer = 0;
    var currentSaved = 0;
	var usedDice = {};

    changeTurn();

    setPlayerName(currentPlayer, name);

	var socket = io.connect(null);
	
	socket.on('update', function (data) {
        console.log("recieved: "+data);

		if(! (data.id in clients)){
			// a new user has come online. create a cursor for them
		}
		
		// Saving the current client state
		clients[data.id] = data;
		clients[data.id].updated = $.now();
	});

	var prev = {};

    $("#message").keypress(function(e){
        if(e.which == 13) {
            var message = $(this).val();
            socket.emit('chat',{
                'message': message,
                'player': name,
                'id': id
            });

            addMessage(message, name);
            $(this).val("");
        }
    });

	socket.on('chat', function (data) {
        console.log("recieved");
        addMessage(data.message, data.player);
	});

    $(".roll").click(function(e){
        if(!$(this).hasClass("disabled")) {

            //make unused dice not selected
            deselectUnused();

            $(".selected").addClass("locked").removeClass("selected");

            var toroll = $(".die").not(".locked").length;

            if(toroll == 0)
                toroll = 6;

            currentSaved = getCurrentScore();

            $(".die").not(".locked").remove();

            if($(".locked").length == 6)
                $(".die").remove();

            var dice = roll(toroll);

            for(i=0;i<toroll;i++)
                $("<div class='die "+getNumberName(dice[i])+"'></div>")
                    .appendTo("#p"+currentPlayer+" .dice")
                    .data("number", dice[i]);

            //check for a zilch
            if(score(dice) == 0) {
                zilch();
                return;
            }

            $("#p"+currentPlayer+" .save").show();
            disableRoll();
            disabledSave();

            $(".die").not(".locked").click(function(e) {
                $(this).toggleClass("selected");

                var selected = [], i = 0;
                $(".selected").each(function() {
                    selected[i] = $(this).data("number");
                    i++;
                });

                var newScore = score(selected);
                if(newScore > 0) {
                    enableRoll();
                    if(getTotalScore() >= 500 || getCurrentScore() >= 500 || currentSaved+newScore >= 500)
                        enableSave();
                    else
                        disabledSave();
                } else {
                    disableRoll();
                    disabledSave();
                }

                $("#p"+currentPlayer+" .current-label").show();
                $("#p"+currentPlayer+" .current").text(currentSaved+newScore);
            });

            socket.emit('change',{
                'dice': dice,
                'id': id
            });
        }
    });

    $(".save").click(function(e){
        if(!$(this).hasClass("disabledSave")) {
            $("#p"+currentPlayer+" .zilch").text("Save").removeClass("zilch").addClass("save");
            var updatedScore = getTotalScore()+getCurrentScore();
            $("#p"+currentPlayer+" .score").text(updatedScore);
            changeTurn();
        }
    });

    // Remove inactive clients after 10 seconds of inactivity
    setInterval(function(){
        for(ident in clients){
			if($.now() - clients[ident].updated > 10000){
				
				// Last update was more than 10 seconds ago. 
				// This user has probably closed the page
				delete clients[ident];
			}
		}
	},10000);

    // rules
    $("#rules-button").click(function(){
        $("#rules").toggle();
    });

    function roll(num) {
        var dice = [];
        for(i=0; i<num; i++)
            dice[i] = Math.floor(Math.random() * 6) + 1;
        return dice;
    }

    function score(dice) {
        var count = [0,0,0,0,0,0,0];
        var score = 0;
        var doubles = 0;
        var unique = 0;
        usedDice = {1:true,5:true};

        for(i=0; i<dice.length; i++)
            count[dice[i]]++;

        //iterate through the count, checking for three of a kinds, etc
        for(i=1; i<7; i++) {
            if(count[i] > 2) {
                if(i == 1)
                    score += 1000*(count[i]-2);
                else
                    score += i*100*(count[i]-2);
                usedDice[i] = true;
            }
            else if(i == 1)
                score += count[i]*100;
            else if(i == 5)
                score += count[i]*50;

            if(count[i] > 0)
                unique++;
            if(count[i] == 2)
                doubles++;
        }

        if(doubles == 3) {
            score = 1000;
            usedDice = {1:true,2:true,3:true,4:true,5:true,6:true};
        }
        if(unique == 6) {
            score = 1500;
            usedDice = {1:true,2:true,3:true,4:true,5:true,6:true};
        }

        return score;
    }
    
    function changeTurn() {
        $("#p"+currentPlayer+" .dice").children().remove();
        $(".dice").hide();
        $(".disabled").removeClass("disabled").addClass("roll");
        $(".roll").hide();
        $(".current-label").hide();
        $(".current").text("0");
        $(".save, .zilch").hide();
        currentPlayer++;
        if(currentPlayer > 4)
            currentPlayer = 1;

        $("#p"+currentPlayer+" .dice").show();
        $("#p"+currentPlayer+" .roll").show();
    }

    function getNumberName(num) {
        if(num == 1)
            return "one";
        if(num == 2)
            return "two";
        if(num == 3)
            return "three";
        if(num == 4)
            return "four";
        if(num == 5)
            return "five";
        if(num == 6)
            return "six";
    }

    function getTotalScore() {
        return parseInt($("#p"+currentPlayer+" .score").text());
    }

    function getCurrentScore() {
        var score = parseInt($("#p"+currentPlayer+" .current").text());
        if(isNaN(score))
            return 0;
        return score;
    }

    function enableSave() {
        $(".disabledSave").removeClass("disabledSave").addClass("save");
    }

    function disabledSave() {
        $("#p"+currentPlayer+" .save").removeClass("save").addClass("disabledSave");
    }

    function enableRoll() {
        $(".disabled").removeClass("disabled").addClass("roll");
    }

    function disableRoll() {
        $("#p"+currentPlayer+" .roll").removeClass("roll").addClass("disabled");
    }

    function zilch() {
        enableSave();
        $("#p"+currentPlayer+" .save").addClass("zilch").removeClass("save").text("Zilch").show();
        $("#p"+currentPlayer+" .current-label").show();
        $("#p"+currentPlayer+" .current").text("Zilch!");
        disableRoll();
    }
    function deselectUnused() {
        for(i=1; i<7; i++)
            if(usedDice[i] != true)
                $("."+getNumberName(i)).removeClass("selected");
    }

    function addMessage(message, name) {
        $("#chat").text($("#chat").text()+"\n"+name+": "+message);
    }

    function setPlayerName(id, name) {
        $("#p"+id+" .name").text(name);
    }
}
