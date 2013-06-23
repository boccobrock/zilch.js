$(function(){
	// Generate an unique ID
	var id = Math.round($.now()*Math.random());
	
	var clients = {};

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


    $("#roll").click(function(e){
        $("#dice").children().remove();
        
        var dice = roll(6);

        for(i=0;i<6;i++)
            $("#dice").append("<div class='die'>"+dice[i]+"</div>");
        $("#score").text(score(dice));

        socket.emit('change',{
            'dice': dice,
            'id': id
        });
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

        for(i=0; i<dice.length; i++)
            count[dice[i]]++;

        //iterate through the count, checking for three of a kinds, etc
        for(i=1; i<7; i++) {
            if(count[i] > 2) {
                if(i == 1)
                    score += 1000*(count[i]-2);
                else
                    score += i*100*(count[i]-2);
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

        if(doubles == 3)
            score = 1000;
        if(unique == 6)
            score = 1500;

        return score;
    }
});
